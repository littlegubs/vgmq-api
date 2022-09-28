import { Readable } from 'stream'

import { InjectQueue } from '@nestjs/bull'
import {
    forwardRef,
    Inject,
    Logger,
    NotFoundException,
    UseFilters,
    UseGuards,
} from '@nestjs/common'
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
import { Queue } from 'bull'
import { classToClass } from 'class-transformer'
import * as dayjs from 'dayjs'
import { Server, Socket } from 'socket.io'
import { Brackets, Not, Repository } from 'typeorm'

import { WsNotFoundExceptionFilter } from '../auth/exception-filter/ws-not-found.exception-filter'
import { WsUnauthorizedExceptionFilter } from '../auth/exception-filter/ws-unauthorized.exception-filter'
import { WsGuard } from '../auth/guards/ws.guard'
import { Game } from '../games/entity/game.entity'
import { Music } from '../games/entity/music.entity'
import { S3Service } from '../s3/s3.service'
import { User } from '../users/user.entity'
import { LobbyMusic } from './entities/lobby-music.entity'
import { LobbyUser, LobbyUserRole, LobbyUserStatus } from './entities/lobby-user.entity'
import { Lobby, LobbyStatuses } from './entities/lobby.entity'
import { InvalidPasswordException } from './exceptions/invalid-password.exception'
import { MissingPasswordException } from './exceptions/missing-password.exception'
import { LobbyService } from './lobby.service'
import { Duration } from './mp3'

export class AuthenticatedSocket extends Socket {
    user: User
}

@UseFilters(WsUnauthorizedExceptionFilter, WsNotFoundExceptionFilter)
@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
@UseGuards(WsGuard)
export class LobbyGateway implements OnGatewayConnection {
    @WebSocketServer()
    server: Server
    private readonly logger = new Logger(LobbyGateway.name)

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
        private s3Service: S3Service,
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
        const lobbyUser = await this.lobbyUserRepository.findOne({
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
            await this.lobbyUserRepository.save({
                lobby: lobby,
                user: client.user,
                role:
                    lobby.status === LobbyStatuses.Waiting
                        ? LobbyUserRole.Player
                        : LobbyUserRole.Spectator,
            })
        } else {
            // if user was previously in lobby, set them connected
            await this.lobbyUserRepository.save({ ...lobbyUser, disconnected: false, status: null })
        }
        await client.join(lobby.code)
        client.emit(
            'lobbyJoined',
            classToClass<Lobby>(lobby, { groups: ['lobby'] }),
        )

        if (
            [LobbyStatuses.PlayingMusic.toString(), LobbyStatuses.AnswerReveal.toString()].includes(
                lobby.status,
            )
        ) {
            const lobbyMusic = await this.lobbyMusicRepository.findOne({
                relations: {
                    lobby: true,
                    gameToMusic: {
                        game: true,
                        music: true,
                    },
                },
                where: {
                    lobby: { id: lobby.id },
                    position: lobby.currentLobbyMusicPosition!,
                },
            })
            if (lobbyMusic !== null) {
                if (lobby.status === LobbyStatuses.PlayingMusic)
                    this.sendLobbyMusicToLoad(lobbyMusic, client)
                if (lobby.status === LobbyStatuses.AnswerReveal) this.sendAnswer(lobbyMusic, client)
            }
        }

        this.sendLobbyUsers(
            lobby,
            await this.lobbyUserRepository.find({
                relations: ['user'],
                where: {
                    lobby: {
                        id: lobby.id,
                    },
                },
            }),
        )

        return
    }

    @SubscribeMessage('reconnect')
    async reconnect(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() code: string,
    ): Promise<void> {
        const lobby = await this.lobbyRepository.findOne({
            relations: ['lobbyMusics'],
            where: {
                code: code,
            },
        })
        if (lobby === null) {
            throw new WsException('Not found')
        }
        const lobbyUser = await this.lobbyUserRepository.findOne({
            relations: ['user', 'lobby'],
            where: {
                user: {
                    id: client.user.id,
                },
                lobby: {
                    id: lobby.id,
                },
            },
        })
        if (lobbyUser === undefined) {
            throw new WsException('Not found')
        }
        await this.lobbyUserRepository.save({ ...lobbyUser, status: null, toDisconnect: false })
        await client.join(lobby.code)
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
        await this.lobbyService.loadMusics(lobby)
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
        const lobby = lobbyUser?.lobby
        if (lobby === undefined || lobby.status !== LobbyStatuses.PlayingMusic) {
            throw new WsException('Not found')
        }

        const lobbyMusic = await this.lobbyMusicRepository
            .createQueryBuilder('lobbyMusic')
            .innerJoinAndSelect('lobbyMusic.expectedAnswers', 'expectedAnswers')
            .leftJoinAndSelect('expectedAnswers.alternativeNames', 'expectedAnswerAlternativeName')
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
        })
        if (lobbyUser.correctAnswer) {
            await this.lobbyUserRepository.save(lobbyUser)
            // give points with queue
        }
        this.server.to(lobby.code).emit(
            'lobbyUserAnswer',
            classToClass<LobbyUser>(lobbyUser, {
                groups: ['wsLobby'],
                strategy: 'excludeAll',
            }),
        )

        return
    }

    @SubscribeMessage('restart')
    async restart(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
        const lobbyUser = await this.lobbyUserRepository.findOne({
            relations: {
                user: true,
                lobby: true,
            },
            where: {
                user: {
                    id: client.user.id,
                },
                role: LobbyUserRole.Host,
            },
        })
        if (lobbyUser === null) {
            return
        }
        await this.lobbyQueue.add('finalResult', lobbyUser.lobby.code)
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
            if (lobbyUser.status === LobbyUserStatus.Reconnecting) {
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

    async sendLobbyMusicToLoad(
        lobbyMusic: LobbyMusic,
        client?: AuthenticatedSocket,
    ): Promise<void> {
        const gameToMusic = lobbyMusic.gameToMusic
        const s3Object = await this.s3Service.getObject(gameToMusic.music.file.path)

        const bodyContents = await this.s3Service.streamToBuffer(s3Object.Body as Readable)
        const { offset } = Duration.getDurationFromBuffer(bodyContents)

        const valuePerSecond = (bodyContents.length - offset) / gameToMusic.music.duration
        const startBit = lobbyMusic.startAt * valuePerSecond
        const endBit = lobbyMusic.endAt * valuePerSecond
        const audioBuffer = bodyContents.slice(startBit + offset, endBit + offset)

        if (client) {
            client.emit('lobbyPlayMusic', audioBuffer)
            client.emit('currentLobbyMusic', {
                contributeToMissingData: lobbyMusic.contributeToMissingData,
                musicFinishesIn: dayjs(lobbyMusic.musicFinishPlayingAt).diff(dayjs(), 'seconds'),
            })
        } else {
            this.server.to(lobbyMusic.lobby.code).emit('lobbyPlayMusic', audioBuffer)
            this.server.to(lobbyMusic.lobby.code).emit('currentLobbyMusic', {
                contributeToMissingData: lobbyMusic.contributeToMissingData,
            })
        }
    }

    sendLobbyClosed(lobby: Lobby, message: string): void {
        this.server.in(lobby.code).disconnectSockets()
    }

    sendLobbyUsers(lobby: Lobby, lobbyUsers: LobbyUser[]): void {
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
        this.server.to(lobby.code).emit(
            'lobbyReset',
            classToClass<Lobby>(lobby, { groups: ['lobby'] }),
        )
    }

    sendLobbyToast(lobby: Lobby, message: string): void {
        this.server.to(lobby.code).emit('lobbyToast', message)
    }
}
