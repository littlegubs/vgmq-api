import { spawn } from 'child_process'

import { InjectQueue } from '@nestjs/bull'
import { forwardRef, Inject, NotFoundException, UseFilters } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    WsException,
} from '@nestjs/websockets'
import { NestGateway } from '@nestjs/websockets/interfaces/nest-gateway.interface'
import { Queue } from 'bull'
import { classToClass } from 'class-transformer'
import * as dayjs from 'dayjs'
import { Server } from 'socket.io'
import { Brackets, Not, Repository } from 'typeorm'

import { WsNotFoundExceptionFilter } from '../auth/exception-filter/ws-not-found.exception-filter'
import { WsUnauthorizedExceptionFilter } from '../auth/exception-filter/ws-unauthorized.exception-filter'
import { Game } from '../games/entity/game.entity'
import { Music } from '../games/entity/music.entity'
import { S3Service } from '../s3/s3.service'
import { UsersService } from '../users/users.service'
import { shuffle } from '../utils/utils'
import { LobbyMusic } from './entities/lobby-music.entity'
import { LobbyUser, LobbyUserRole, LobbyUserStatus } from './entities/lobby-user.entity'
import { Lobby, LobbyHintMode, LobbyStatuses } from './entities/lobby.entity'
import { InvalidPasswordException } from './exceptions/invalid-password.exception'
import { MissingPasswordException } from './exceptions/missing-password.exception'
import { LobbyFileGateway } from './lobby-file.gateway'
import { LobbyMusicLoaderService } from './services/lobby-music-loader.service'
import { LobbyUserService } from './services/lobby-user.service'
import { LobbyService } from './services/lobby.service'
import { AuthenticatedSocket, WSAuthMiddleware } from './socket-middleware'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpeg = require('ffmpeg-static') as string

export function getHintModeGameNames(lobbyMusic: LobbyMusic): string[] {
    return shuffle(lobbyMusic.hintModeGames.map((game) => game.name))
}

@UseFilters(WsUnauthorizedExceptionFilter, WsNotFoundExceptionFilter)
@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class LobbyGateway implements NestGateway, OnGatewayConnection {
    @WebSocketServer()
    server: Server

    constructor(
        @InjectRepository(Lobby)
        private lobbyRepository: Repository<Lobby>,
        @InjectRepository(Game)
        private gameRepository: Repository<Game>,
        @InjectRepository(Music)
        private musicRepository: Repository<Music>,
        @InjectRepository(LobbyMusic)
        private lobbyMusicRepository: Repository<LobbyMusic>,
        @InjectRepository(LobbyUser)
        private lobbyUserRepository: Repository<LobbyUser>,
        @InjectQueue('lobby') private lobbyQueue: Queue,
        @Inject(forwardRef(() => LobbyService))
        private lobbyService: LobbyService,
        @Inject(forwardRef(() => LobbyMusicLoaderService))
        private lobbyMusicLoaderService: LobbyMusicLoaderService,
        private s3Service: S3Service,
        private lobbyUserService: LobbyUserService,
        private readonly jwtService: JwtService,
        private readonly userService: UsersService,
        private lobbyFileGateway: LobbyFileGateway,
    ) {}

    @SubscribeMessage('join')
    async join(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() body: { code: string; password: string | null },
    ): Promise<undefined> {
        const lobby = await this.lobbyRepository.findOne({
            relations: ['lobbyMusics'],
            where: {
                code: body.code,
            },
        })
        if (lobby === null) {
            throw new NotFoundException()
        }
        let lobbyUser = await this.lobbyUserRepository.findOne({
            relations: ['user', 'lobby'],
            where: {
                user: {
                    id: client.user.id,
                },
                lobby: {
                    id: lobby?.id,
                },
            },
        })
        if (lobbyUser === null) {
            if (lobby.hasPassword) {
                if (body.password === null) {
                    throw new MissingPasswordException()
                }
                if (body.password !== lobby.password) {
                    throw new InvalidPasswordException()
                }
            }
            lobbyUser = this.lobbyUserRepository.create(
                await this.lobbyUserRepository.save({
                    lobby: lobby,
                    user: client.user,
                    role:
                        lobby.status === LobbyStatuses.Waiting
                            ? LobbyUserRole.Player
                            : LobbyUserRole.Spectator,
                }),
            )
        } else {
            // if user was previously in lobby, set them connected
            lobbyUser = this.lobbyUserRepository.create(
                await this.lobbyUserRepository.save({
                    ...lobbyUser,
                    disconnected: false,
                    isReconnecting: false,
                }),
            )
        }
        await client.join(lobby.code)
        await client.join(`lobbyUser${lobbyUser.id}`)
        client.emit('lobbyJoined', classToClass<Lobby>(lobby, { groups: ['lobby'] }))
        if (lobby.hintMode === LobbyHintMode.Always || lobbyUser.hintMode) {
            await this.showHintModeGames(lobbyUser, client, false)
        }
        if (
            [LobbyStatuses.PlayingMusic.toString(), LobbyStatuses.AnswerReveal.toString()].includes(
                lobby.status,
            )
        ) {
            const lobbyMusic = await this.lobbyMusicRepository.findOne({
                relations: {
                    lobby: true,
                    gameToMusic: {
                        game: {
                            cover: {
                                colorPalette: true,
                            },
                        },
                        music: true,
                    },
                },
                where: {
                    lobby: { id: lobby.id },
                    position: lobby.currentLobbyMusicPosition!,
                },
            })
            if (lobbyMusic !== null) {
                if (lobby.status === LobbyStatuses.PlayingMusic) this.playMusic(lobbyMusic, client)
                if (lobby.status === LobbyStatuses.AnswerReveal) this.sendAnswer(lobbyMusic, client)
            }
        }
        await this.sendLobbyUsers(lobby)

        return
    }

    @SubscribeMessage('play')
    async play(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() code: string,
    ): Promise<void> {
        let lobby = await this.lobbyRepository.findOneBy({
            code,
        })
        if (lobby === null) {
            throw new WsException('Not found')
        }
        lobby = this.lobbyRepository.create({ ...lobby, status: LobbyStatuses.Loading })
        await this.lobbyRepository.save(lobby)
        this.sendUpdateToRoom(lobby)
        await this.lobbyMusicLoaderService.loadMusics(lobby)
    }

    @SubscribeMessage('chat')
    async chat(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() message: string,
    ): Promise<void> {
        const lobbyUser = await this.lobbyUserService.getLobbyUserByUsername(client.user.username)
        if (lobbyUser === null) {
            throw new WsException('Not found')
        }
        message = message.trim()
        if (message !== '') {
            this.server
                .to(lobbyUser.lobby.code)
                .emit('chat', { username: lobbyUser.user.username, message })
        }
    }

    @SubscribeMessage('answer')
    async answer(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() answer: string,
    ): Promise<undefined> {
        let lobbyUser = await this.lobbyUserRepository.findOne({
            relations: ['lobby', 'user'],
            where: {
                user: {
                    id: client.user.id,
                },
                role: Not(LobbyUserRole.Spectator),
            },
        })
        if (!lobbyUser || lobbyUser.correctAnswer) {
            throw new WsException('Not found')
        }
        const lobby = lobbyUser.lobby
        if (lobby === undefined || lobby.status !== LobbyStatuses.PlayingMusic) {
            throw new WsException('Not found')
        }

        if (lobbyUser.hintMode) {
            lobbyUser = this.lobbyUserRepository.create(
                await this.lobbyUserRepository.save({ ...lobbyUser, answer }),
            )
            this.server.to(lobby.code).emit(
                'lobbyUser',
                classToClass<LobbyUser>(lobbyUser, {
                    groups: ['wsLobby'],
                    strategy: 'excludeAll',
                }),
            )
            return
        }

        lobbyUser = await this.verifyAnswer(lobby, answer, lobbyUser)
        this.server.to(lobby.code).emit(
            'lobbyUser',
            classToClass<LobbyUser>(lobbyUser, {
                groups: ['wsLobby'],
                strategy: 'excludeAll',
            }),
        )
        if (!lobbyUser.correctAnswer) {
            await this.lobbyUserRepository.save({ ...lobbyUser, correctAnswer: null }) // set correct answer to null to prevent bugs
        }

        return
    }

    public async verifyAnswer(
        lobby: Lobby,
        answer: string,
        lobbyUser: LobbyUser,
    ): Promise<LobbyUser> {
        const lobbyMusic = await this.lobbyMusicRepository
            .createQueryBuilder('lobbyMusic')
            .innerJoinAndSelect('lobbyMusic.expectedAnswers', 'expectedAnswers')
            .leftJoinAndSelect('expectedAnswers.alternativeNames', 'expectedAnswerAlternativeName')
            .leftJoinAndSelect('lobbyMusic.gameToMusic', 'gameToMusic')
            .leftJoinAndSelect('gameToMusic.game', 'game')
            .andWhere('expectedAnswers.enabled = 1')
            .andWhere('lobbyMusic.lobby = :lobby', { lobby: lobby.id })
            .andWhere('lobbyMusic.position = :position', {
                position: lobby.currentLobbyMusicPosition,
            })
            .andWhere(
                new Brackets((qb) => {
                    qb.where(
                        new Brackets((qb2) => {
                            qb2.andWhere(
                                new Brackets((qb3) => {
                                    qb3.orWhere('expectedAnswerAlternativeName.enabled IS NULL')
                                    qb3.orWhere('expectedAnswerAlternativeName.enabled = 0')
                                    qb3.orWhere('expectedAnswerAlternativeName.enabled = 1')
                                }),
                            )
                            qb2.andWhere('expectedAnswers.name LIKE :answer')
                        }),
                    )
                    qb.orWhere(
                        new Brackets((qb4) => {
                            qb4.andWhere('expectedAnswerAlternativeName.enabled = 1')
                            qb4.andWhere('expectedAnswerAlternativeName.name LIKE :answer')
                        }),
                    )
                }),
            )
            .setParameter('answer', answer)
            .setParameter('position', lobby.currentLobbyMusicPosition)
            .getOne()

        lobbyUser = this.lobbyUserRepository.create({
            ...lobbyUser,
            correctAnswer: !!lobbyMusic,
            tries: lobbyUser.tries + 1,
        })

        if (lobbyUser.correctAnswer && lobbyMusic) {
            let pointsToWin = 10
            if (
                !(await this.userService.userHasPlayedTheGame(
                    lobbyUser.user,
                    lobbyMusic.gameToMusic.game,
                ))
            ) {
                pointsToWin += 5
            }
            if (lobbyUser.tries === 1) pointsToWin += 5
            lobbyUser = this.lobbyUserRepository.create({
                ...lobbyUser,
                points: lobbyUser.points + (lobbyUser.hintMode ? 5 : pointsToWin),
                musicGuessedRight: lobbyUser.musicGuessedRight + 1,
            })
            this.lobbyUserRepository.create(await this.lobbyUserRepository.save(lobbyUser))
        }
        return lobbyUser
    }

    @SubscribeMessage('restart')
    async restart(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
        const lobbyUser = await this.lobbyUserService.getLobbyHostByUser(client.user)
        if (lobbyUser === null) {
            return
        }
        await this.lobbyQueue.add('finalResult', lobbyUser.lobby.code)
    }

    @SubscribeMessage('kick')
    async kick(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() username: string,
    ): Promise<void> {
        const lobbyHost = await this.lobbyUserService.getLobbyHostByUser(client.user)
        if (lobbyHost === null) {
            return
        }
        const lobbyUser = await this.lobbyUserService.getLobbyUserByUsername(
            username,
            lobbyHost.lobby,
        )
        if (!lobbyUser) {
            throw new WsException('Not found')
        }
        await this.lobbyUserRepository.remove(lobbyUser)
    }

    @SubscribeMessage('leave')
    async leave(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
        const lobbyUser = await this.lobbyUserRepository.findOne({
            relations: {
                user: true,
            },
            where: {
                user: {
                    id: client.user.id,
                },
            },
        })
        if (lobbyUser === null) {
            return
        }
        await this.lobbyUserRepository.save({ ...lobbyUser, toDisconnect: true })
        await this.lobbyQueue.add('disconnectUser', lobbyUser.id)
    }

    @SubscribeMessage('readyToPlayMusic')
    async readyToPlayMusic(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
        const lobbyUser = await this.lobbyUserRepository.findOne({
            relations: {
                user: true,
                lobby: true,
            },
            where: {
                user: {
                    id: client.user.id,
                },
                status: LobbyUserStatus.Buffering,
            },
        })
        if (lobbyUser === null) {
            return
        }

        // We do not care if the user is ready or not
        if (lobbyUser.lobby.status === LobbyStatuses.PlayingMusic) {
            await this.lobbyUserRepository.save({
                ...lobbyUser,
                status: null,
            })
            this.server.to(lobbyUser.lobby.code).emit(
                'lobbyUser',
                classToClass<LobbyUser>(lobbyUser, {
                    groups: ['wsLobby'],
                    strategy: 'excludeAll',
                }),
            )
            return
        }

        await this.lobbyUserRepository.save({
            ...lobbyUser,
            status: LobbyUserStatus.ReadyToPlayMusic,
        })
        this.server.to(lobbyUser.lobby.code).emit(
            'lobbyUser',
            classToClass<LobbyUser>(lobbyUser, {
                groups: ['wsLobby'],
                strategy: 'excludeAll',
            }),
        )

        if (lobbyUser.lobby.status === LobbyStatuses.Buffering) {
            if (await this.lobbyUserService.areAllUsersReadyToPlay(lobbyUser.lobby)) {
                await this.lobbyQueue.add('playMusic', lobbyUser.lobby.code)
            }
        }
    }

    @SubscribeMessage('enableHintMode')
    async enableHintMode(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
        let lobbyUser = await this.lobbyUserService.getLobbyUserByUsername(client.user.username)
        if (lobbyUser === null) {
            throw new WsException('Not found')
        }
        if (lobbyUser.lobby.hintMode === LobbyHintMode.Disabled) {
            throw new WsException('')
        }
        lobbyUser = this.lobbyUserRepository.create(
            await this.lobbyUserRepository.save({ ...lobbyUser, hintMode: true }),
        )
        await this.showHintModeGames(lobbyUser, client)
    }

    private async showHintModeGames(
        lobbyUser: LobbyUser,
        client: AuthenticatedSocket,
        emitToLobby = true,
    ): Promise<void> {
        const lobbyMusic = await this.lobbyMusicRepository.findOne({
            relations: {
                lobby: true,
                gameToMusic: {
                    music: true,
                },
                hintModeGames: true,
            },
            where: {
                lobby: {
                    id: lobbyUser.lobby.id,
                },
                position: lobbyUser.lobby.currentLobbyMusicPosition!,
            },
        })
        if (lobbyMusic) {
            client.emit('hintModeGames', getHintModeGameNames(lobbyMusic))
            if (emitToLobby) {
                this.server.to(lobbyUser.lobby.code).emit(
                    'lobbyUser',
                    classToClass<LobbyUser>(lobbyUser, {
                        groups: ['wsLobby'],
                        strategy: 'excludeAll',
                    }),
                )
            }
        }
    }

    public showHintModeGamesToHintModeUsers(lobbyMusic: LobbyMusic, lobbyUsers: LobbyUser[]): void {
        this.server
            .to(lobbyUsers.map((lobbyUser) => `lobbyUser${lobbyUser.id}`))
            .emit('hintModeGames', getHintModeGameNames(lobbyMusic))
    }

    @SubscribeMessage('toggleKeepHintMode')
    async toggleKeepHintMode(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() bool: boolean,
    ): Promise<void> {
        const lobbyUser = await this.lobbyUserService.getLobbyUserByUsername(client.user.username)
        if (lobbyUser === null) {
            throw new WsException('Not found')
        }
        if (lobbyUser.lobby.hintMode === LobbyHintMode.Disabled) {
            throw new WsException('')
        }
        await this.lobbyUserRepository.save({ ...lobbyUser, keepHintMode: bool })
    }

    afterInit(): void {
        const middle = WSAuthMiddleware(this.jwtService, this.userService, this.lobbyUserRepository)
        this.server.use(middle)
    }

    handleConnection(client: AuthenticatedSocket, ...args: any): any {
        client.on('disconnecting', async (reason) => {
            if (reason === 'server namespace disconnect') {
                return
            }
            if (client.user === undefined) {
                return
            }
            const lobbyUser = await this.lobbyUserRepository.findOne({
                relations: {
                    user: true,
                },
                where: {
                    user: {
                        id: client.user.id,
                    },
                },
            })
            if (lobbyUser === null) {
                return
            }
            if (lobbyUser.isReconnecting) {
                // don't disconnect if reconnecting
                return
            }
            await this.lobbyUserRepository.save({ ...lobbyUser, toDisconnect: true })
            await this.lobbyQueue.add('disconnectUser', lobbyUser.id, {
                delay: 30 * 1000, // 30 seconds
            })
        })
    }

    sendUpdateToRoom(lobby: Lobby): void {
        this.server.to(lobby.code).emit(
            'lobby',
            classToClass<Lobby>(lobby, {
                groups: ['lobby'],
                strategy: 'excludeAll',
                excludeExtraneousValues: false,
            }),
        )
    }

    async sendLobbyMusicToLoad(lobbyMusic: LobbyMusic): Promise<void> {
        const gameToMusic = lobbyMusic.gameToMusic
        const url = await this.s3Service.getSignedUrl(gameToMusic.music.file.path)
        if (ffmpeg === null) {
            throw new WsException('could not encode mp3 file')
        }
        const command = `-i ${url} -ss ${
            lobbyMusic.startAt > 0 ? `${lobbyMusic.startAt}` : '0.001' // for some reason, the file is broken if I start at 0 on chrome???
        } -t ${
            lobbyMusic.lobby.playMusicOnAnswerReveal
                ? lobbyMusic.lobby.guessTime + 10
                : lobbyMusic.lobby.guessTime
        } -f mp3 -`
        const ffmpegProcess = spawn(ffmpeg, command.split(' '))
        let output: Buffer[] = []
        ffmpegProcess.stdout.on('data', (data: Buffer) => {
            output = [...output, data]
        })

        ffmpegProcess.on('close', (code) => {
            if (code === 0) {
                this.lobbyFileGateway.sendBuffer(lobbyMusic.lobby.code, Buffer.concat(output))
            } else {
                throw new WsException('error during mp3 encoding')
            }
        })
    }

    playMusic(lobbyMusic: LobbyMusic, client?: AuthenticatedSocket): void {
        if (client) {
            client.emit('currentLobbyMusic', {
                contributeToMissingData: lobbyMusic.contributeToMissingData,
                musicFinishesIn: dayjs(lobbyMusic.musicFinishPlayingAt).diff(dayjs(), 'seconds'),
            })
        } else {
            this.server.to(lobbyMusic.lobby.code).emit('currentLobbyMusic', {
                contributeToMissingData: lobbyMusic.contributeToMissingData,
            })
        }
    }

    sendLobbyClosed(lobby: Lobby, message: string): void {
        this.server.in(lobby.code).disconnectSockets()
    }

    async sendLobbyUsers(lobby: Lobby, lobbyUsers?: LobbyUser[]): Promise<void> {
        if (!lobbyUsers) {
            lobbyUsers = await this.lobbyUserRepository.find({
                relations: {
                    lobby: true,
                    user: true,
                },
                where: {
                    lobby: {
                        id: lobby.id,
                    },
                },
            })
        }
        this.server.to(lobby.code).emit(
            'lobbyUsers',
            classToClass<LobbyUser[]>(lobbyUsers, {
                groups: ['wsLobby'],
                strategy: 'excludeAll',
            }),
        )
    }

    sendAnswer(lobbyMusic: LobbyMusic, client?: AuthenticatedSocket): void {
        const data = classToClass<LobbyMusic>(lobbyMusic, {
            strategy: 'excludeAll',
            groups: ['lobby-answer-reveal'],
        })
        if (client) {
            client.emit('lobbyAnswer', data)
        } else {
            this.server.to(lobbyMusic.lobby.code).emit('lobbyAnswer', data)
        }
    }
    sendLobbyReset(lobby: Lobby): void {
        this.server
            .to(lobby.code)
            .emit('lobbyReset', classToClass<Lobby>(lobby, { groups: ['lobby'] }))
    }

    sendLobbyToast(lobby: Lobby, message: string): void {
        this.server.to(lobby.code).emit('lobbyToast', message)
    }

    sendLobbyLoadProgress(lobby: Lobby, message: number | string | undefined): void {
        this.server.to(lobby.code).emit('lobbyLoadProgress', message)
    }
}
