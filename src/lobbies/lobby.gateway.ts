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
import { instanceToInstance } from 'class-transformer'
import dayjs from 'dayjs'
import { Server } from 'socket.io'
import { Brackets, Not, Repository } from 'typeorm'

import { WsNotFoundExceptionFilter } from '../auth/exception-filter/ws-not-found.exception-filter'
import { WsUnauthorizedExceptionFilter } from '../auth/exception-filter/ws-unauthorized.exception-filter'
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
import { AuthenticatedSocket, WSAuthMiddleware } from './socket-middleware'
import { LobbyStatService } from './services/lobby-stat.service'
import { OauthPatreon } from '../oauth/entities/oauth-patreon.entity'
import { GameToMusic } from '../games/entity/game-to-music.entity'

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
        @InjectRepository(Lobby) private lobbyRepository: Repository<Lobby>,
        @InjectRepository(LobbyMusic) private lobbyMusicRepository: Repository<LobbyMusic>,
        @InjectRepository(LobbyUser) private lobbyUserRepository: Repository<LobbyUser>,
        @InjectQueue('lobby') private lobbyQueue: Queue,
        @Inject(forwardRef(() => LobbyMusicLoaderService))
        private lobbyMusicLoaderService: LobbyMusicLoaderService,
        private lobbyUserService: LobbyUserService,
        private readonly jwtService: JwtService,
        private readonly userService: UsersService,
        private lobbyFileGateway: LobbyFileGateway,
        private lobbyStatService: LobbyStatService,
        @InjectRepository(OauthPatreon) private oAuthPatreonRepository: Repository<OauthPatreon>,
        @InjectRepository(GameToMusic) private gameToMusicRepository: Repository<GameToMusic>,
    ) {}

    @SubscribeMessage('join')
    async join(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() body: { code: string; password: string | null },
    ): Promise<undefined> {
        let lobby = await this.lobbyRepository.findOne({
            relations: { lobbyUsers: { user: true } },
            where: {
                code: body.code,
            },
        })
        if (lobby === null) {
            throw new NotFoundException()
        }
        let lobbyUser = await this.lobbyUserRepository.findOne({
            relations: {
                user: { patreonAccount: true },
                lobby: true,
            },
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
                        lobby.status === LobbyStatuses.Waiting || lobby.musicNumber === -1
                            ? LobbyUserRole.Player
                            : LobbyUserRole.Spectator,
                    lastAnswerAt: new Date(),
                }),
            )
        } else {
            // if user was previously in lobby, set them connected
            await this.lobbyUserRepository.save({
                ...lobbyUser,
                disconnected: false,
                isReconnecting: false,
            })
        }
        // refresh lobby as it might be premium now
        lobby = (await this.lobbyRepository.findOne({
            relations: {
                collectionFilters: true,
                genreFilters: true,
                themeFilters: true,
                lobbyUsers: { user: true },
            },
            where: {
                code: body.code,
            },
        })) as Lobby
        await client.join(lobby.code)
        await client.join(`lobbyUser${lobbyUser.id}`)
        client.emit('lobbyJoined', instanceToInstance<Lobby>(lobby, { groups: ['lobby'] }))
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
                    video: true,
                    screenshots: true,
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
        if (!lobby.custom && lobby.musicNumber === -1 && lobby.status === LobbyStatuses.Waiting) {
            await this.lobbyRepository.save({ ...lobby, status: LobbyStatuses.Playing })
            await this.lobbyQueue.add('bufferMusic', lobbyUser.lobby.code, {
                timeout: 10_000,
            })
        }
        if (lobby.status === LobbyStatuses.Result) {
            await this.lobbyStatService.retrieveResultData(lobby)
            await this.sendLobbyUsers(lobby, lobby.lobbyUsers, client)
            await this.sendResultData(lobby)
        } else {
            await this.sendLobbyUsers(lobby, undefined, client)
        }
        this.server.to(lobby.code).emit(
            'lobbyUser',
            instanceToInstance<LobbyUser>(lobbyUser, {
                groups: ['wsLobby'],
                strategy: 'excludeAll',
            }),
        )

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
            this.emitChat(lobbyUser.lobby.code, lobbyUser.user.username, message)
        }
    }

    public emitChat(lobbyCode: string, username: string | null, message: string): void {
        this.server.to(lobbyCode).emit('chat', { username: username, message })
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
            Object.assign(lobbyUser, { ...lobbyUser, answer })
            await this.lobbyUserRepository.save(lobbyUser)
            this.server.to(lobby.code).emit(
                'lobbyUser',
                instanceToInstance<LobbyUser>(lobbyUser, {
                    groups: ['wsLobby'],
                    strategy: 'excludeAll',
                }),
            )
            return
        }

        lobbyUser = await this.verifyAnswer(lobby, answer, lobbyUser)
        if (lobbyUser.correctAnswer && !lobby.showCorrectAnswersDuringGuessTime) {
            client.emit(
                'lobbyUser',
                instanceToInstance<LobbyUser>(lobbyUser, {
                    groups: ['wsLobby'],
                    strategy: 'excludeAll',
                }),
            )
        } else {
            this.server.to(lobby.code).emit(
                'lobbyUser',
                instanceToInstance<LobbyUser>(lobbyUser, {
                    groups: ['wsLobby'],
                    strategy: 'excludeAll',
                }),
            )
        }

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
        const answerQuery = this.lobbyMusicRepository
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
                    qb.orWhere('expectedAnswers.name LIKE :answer')
                    qb.orWhere(
                        new Brackets((qb4) => {
                            qb4.andWhere('expectedAnswerAlternativeName.enabled = 1')
                            qb4.andWhere('expectedAnswerAlternativeName.name LIKE :answer')
                        }),
                    )
                    if (lobby.allowCollectionAnswer) {
                        qb.orWhere('expectedAnswerCollection.name LIKE :answer')
                    }
                }),
            )
            .setParameter('answer', answer)
            .setParameter('position', lobby.currentLobbyMusicPosition)

        if (lobby.allowCollectionAnswer) {
            answerQuery.leftJoinAndSelect('expectedAnswers.collections', 'expectedAnswerCollection')
        }
        const lobbyMusic = await answerQuery.getOne()

        Object.assign(lobbyUser, {
            ...lobbyUser,
            correctAnswer: !!lobbyMusic,
            tries: lobbyUser.tries + 1,
            lastAnswerAt: dayjs().toDate(),
        })

        if (lobbyUser.correctAnswer && lobbyMusic) {
            let pointsToWin = 10
            if (lobbyUser.tries === 1) pointsToWin += 5
            Object.assign(lobbyUser, {
                ...lobbyUser,
                points: lobbyUser.points + (lobbyUser.hintMode ? 5 : pointsToWin),
                musicGuessedRight: lobbyUser.musicGuessedRight + 1,
            })

            await this.lobbyUserRepository.save(lobbyUser)
        }

        if (lobby.custom) {
            // Stats
            void this.lobbyStatService.increment(
                `lobby${lobby.code}:stats:user:${lobbyUser.id}`,
                lobbyUser.correctAnswer ? 'correct' : 'wrong',
            )
            void this.lobbyStatService.increment(
                `lobby${lobby.code}:stats:user:${lobbyUser.id}`,
                'tries',
            )
            if (!lobbyUser.hintMode) {
                if (lobbyUser.correctAnswer && lobbyMusic) {
                    const timeToAnswer = dayjs(lobbyUser.lastAnswerAt).diff(
                        dayjs(lobbyMusic.musicStartedPlayingAt),
                        'ms',
                    )
                    void this.lobbyStatService.rpush(
                        `lobby${lobby.code}:stats:user:${lobbyUser.id}:time`,
                        timeToAnswer,
                    )

                    if (lobbyUser.tries === 1) {
                        void this.lobbyStatService.increment(
                            `lobby${lobby.code}:stats:user:${lobbyUser.id}`,
                            'firstTry',
                        )
                    }
                }
            }
        }

        return lobbyUser
    }

    @SubscribeMessage('restart')
    async restart(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
        const lobbyUser = await this.lobbyUserService.getLobbyHostByUser(client.user)
        if (lobbyUser === null) {
            return
        }
        await this.lobbyQueue.add('restart', lobbyUser.lobby.code, {
            jobId: `lobby${lobbyUser.lobby.code}restartManual-${Date.now()}`,
        })
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
        await this.lobbyQueue.add('disconnectUser', lobbyUser.id, { removeOnComplete: true })
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
            Object.assign(lobbyUser, {
                ...lobbyUser,
                status: null,
            })
            await this.lobbyUserRepository.save(lobbyUser)
            this.server.to(lobbyUser.lobby.code).emit(
                'lobbyUser',
                instanceToInstance<LobbyUser>(lobbyUser, {
                    groups: ['wsLobby'],
                    strategy: 'excludeAll',
                }),
            )
            return
        }

        Object.assign(lobbyUser, {
            ...lobbyUser,
            status: LobbyUserStatus.ReadyToPlayMusic,
        })
        await this.lobbyUserRepository.save(lobbyUser)
        this.server.to(lobbyUser.lobby.code).emit(
            'lobbyUser',
            instanceToInstance<LobbyUser>(lobbyUser, {
                groups: ['wsLobby'],
                strategy: 'excludeAll',
            }),
        )

        if (lobbyUser.lobby.status === LobbyStatuses.Buffering) {
            if (await this.lobbyUserService.areAllUsersReadyToPlay(lobbyUser.lobby)) {
                await this.lobbyQueue.add('playMusic', lobbyUser.lobby.code, {
                    jobId: `lobby${lobbyUser.lobby.code}playMusicEveryoneReady`,
                })
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
        if (!lobbyUser.correctAnswer) {
            lobbyUser = Object.assign(lobbyUser, { ...lobbyUser, hintMode: true })
            await this.lobbyUserRepository.save(lobbyUser)
            await this.showHintModeGames(lobbyUser, client)
            void this.lobbyStatService.increment(
                `lobby${lobbyUser.lobby.code}:stats:user:${lobbyUser.id}`,
                'hint',
            )
        } else {
            await this.showHintModeGames(lobbyUser, client, false)
        }
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
                    instanceToInstance<LobbyUser>(lobbyUser, {
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
            instanceToInstance<Lobby>(lobby, {
                groups: ['lobby'],
                strategy: 'excludeAll',
                excludeExtraneousValues: false,
            }),
        )
    }

    sendLobbyError(lobby: Lobby, message: string): void {
        this.server.to(lobby.code).emit('error', message)
    }

    sendLobbyMusicToLoad(lobby: Lobby, buffer: Buffer): void {
        this.lobbyFileGateway.sendBuffer(lobby.code, buffer)
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

    sendLobbyStartBuffer(lobby: Lobby): void {
        this.server.to(lobby.code).emit('lobbyStartBuffer')
    }

    sendLobbyBufferEnd(lobby: Lobby): void {
        this.server.to(lobby.code).emit('lobbyBufferEnd')
    }

    async sendLobbyUsers(
        lobby: Lobby,
        lobbyUsers?: LobbyUser[],
        client?: AuthenticatedSocket,
    ): Promise<void> {
        if (!lobbyUsers) {
            lobbyUsers = await this.lobbyUserRepository.find({
                relations: {
                    lobby: true,
                    user: { patreonAccount: true },
                },
                where: {
                    lobby: {
                        id: lobby.id,
                    },
                },
            })
        }
        const receiver = client ?? this.server.to(lobby.code)
        receiver.emit(
            'lobbyUsers',
            instanceToInstance<LobbyUser[]>(lobbyUsers, {
                groups: ['wsLobby'],
                strategy: 'excludeAll',
            }),
        )
    }

    sendAnswer(lobbyMusic: LobbyMusic, client?: AuthenticatedSocket): void {
        const data = instanceToInstance<LobbyMusic>(lobbyMusic, {
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
            .emit('lobbyReset', instanceToInstance<Lobby>(lobby, { groups: ['lobby'] }))
    }

    sendLobbyToast(lobby: Lobby, message: string): void {
        this.server.to(lobby.code).emit('lobbyToast', message)
    }

    sendLobbyLoadProgress(lobby: Lobby, message: number | string | undefined): void {
        this.server.to(lobby.code).emit('lobbyLoadProgress', message)
    }

    async sendResultData(lobby: Lobby) {
        const patreons = await this.oAuthPatreonRepository.find({
            relations: { user: true },
            where: { currentlyEntitledTiers: Not('') },
            order: { campaignLifetimeSupportCents: 'DESC' },
        })

        const databaseContributors = await this.gameToMusicRepository
            .createQueryBuilder('gtm')
            .select('user.username', 'username')
            .addSelect('count(gtm.id)', 'contributions')
            .innerJoin('gtm.addedBy', 'user')
            .groupBy('user.username')
            .orderBy('contributions', 'DESC')
            .getRawMany()

        // SELECT count(*), addedById, username FROM vgmq.game_to_music join vgmq.user on user.id = addedById group by addedById;
        const data = {
            patreons: patreons.map((patreon) => patreon.user.username),
            databaseContributors: databaseContributors.map((contributor) => contributor.username),
        }

        this.server.to(lobby.code).emit('result', data)
    }
}
