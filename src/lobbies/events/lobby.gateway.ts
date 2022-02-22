import { InjectQueue } from '@nestjs/bull'
import {
    CACHE_MANAGER,
    ClassSerializerInterceptor,
    forwardRef,
    Inject,
    Logger,
    SerializeOptions,
    UseFilters,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    WsException,
} from '@nestjs/websockets'
import { Queue } from 'bull'
import { Cache } from 'cache-manager'
import { classToClass } from 'class-transformer'
import { Server, Socket } from 'socket.io'
import { Not, Repository } from 'typeorm'

import { WsExceptionsFilter } from '../../auth/exception-filter/ws.exception-filter'
import { WsGuard } from '../../auth/guards/ws.guard'
import { Game } from '../../games/entity/game.entity'
import { Music } from '../../games/entity/music.entity'
import { User } from '../../users/user.entity'
import { LobbyMusic } from '../entities/lobby-music.entity'
import { LobbyUser, LobbyUserRole } from '../entities/lobby-user.entity'
import { Lobby, LobbyStatuses } from '../entities/lobby.entity'
import { InvalidPasswordException } from '../exceptions/invalid-password.exception'
import { MissingPasswordException } from '../exceptions/missing-password.exception'
import { LobbyService } from '../lobby.service'

export class AuthenticatedSocket extends Socket {
    user: User
}

@UseFilters(new WsExceptionsFilter())
@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
@UseGuards(WsGuard)
export class LobbyGateway {
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
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        @InjectQueue('lobby') private lobbyQueue: Queue,
        @Inject(forwardRef(() => LobbyService))
        private lobbyService: LobbyService,
    ) {}

    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({
        strategy: 'excludeAll',
    })
    @SubscribeMessage('join')
    async join(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() body: { code: string; password: string | null },
    ): Promise<undefined> {
        const lobby = await this.lobbyRepository.findOne({
            code: body.code,
        })
        if (lobby === undefined) {
            throw new WsException('Not found')
        }
        if (lobby.hasPassword) {
            if (body.password === null) {
                throw new MissingPasswordException()
            }
            if (body.password !== lobby.password) {
                throw new InvalidPasswordException()
            }
        }

        const currentLobby = await this.lobbyUserRepository.findOne({
            relations: ['user', 'lobby'],
            where: {
                user: client.user,
            },
        })
        if (currentLobby !== undefined && currentLobby.lobby.code !== lobby.code) {
            await this.lobbyRepository.remove(currentLobby.lobby)
        }

        await client.join(lobby.code)

        const player = await this.lobbyUserRepository.findOne({
            relations: ['user'],
            where: {
                user: client.user,
            },
        })
        if (player === undefined) {
            const players = await this.lobbyUserRepository.find({
                lobby: lobby,
            })
            await this.lobbyUserRepository.save({
                lobby: lobby,
                user: client.user,
                role: players.length === 0 ? LobbyUserRole.Host : LobbyUserRole.Player,
            })
        }

        client.emit('lobbyJoined', lobby)
        if (lobby.status === LobbyStatuses.PlayingMusic) {
            const lobbyMusic = await this.lobbyMusicRepository.findOne({
                relations: ['lobby'],
                where: {
                    lobby: lobby,
                    position: lobby.currentLobbyMusicPosition,
                },
            })
            if (lobbyMusic !== undefined) client.emit('lobbyMusic', lobbyMusic?.id)
        }

        this.server.to(lobby.code).emit(
            'lobbyUsers',
            classToClass<LobbyUser[]>(
                await this.lobbyUserRepository.find({
                    relations: ['user'],
                    where: {
                        lobby: lobby,
                    },
                }),
                {
                    groups: ['wsLobby'],
                    strategy: 'excludeAll',
                },
            ),
        )

        return
    }

    @SubscribeMessage('play')
    async play(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() code: string,
    ): Promise<void> {
        let lobby = await this.lobbyRepository.findOne({
            code,
        })
        if (lobby === undefined) {
            throw new WsException('Not found')
        }
        lobby = this.lobbyRepository.create({ ...lobby, status: LobbyStatuses.Loading })
        await this.lobbyRepository.save(lobby)
        this.sendUpdateToRoom(lobby)
        await this.lobbyService.loadMusics(lobby)
    }

    // @SubscribeMessage('disconnect')
    // async disconnect(
    //     @ConnectedSocket() client: AuthenticatedSocket,
    // ): Promise<undefined> {}

    async answer(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() answer: string,
    ): Promise<undefined> {
        let lobbyUser = await this.lobbyUserRepository.findOne({
            relations: ['lobby', 'user'],
            where: {
                user: client.user,
                role: Not(LobbyUserRole.Spectator),
            },
        })
        const lobby = lobbyUser?.lobby
        if (lobby === undefined || lobby.status !== LobbyStatuses.PlayingMusic) {
            throw new WsException('Not found')
        }

        const lobbyMusic = await this.lobbyMusicRepository
            .createQueryBuilder('lobbyMusic')
            .innerJoinAndSelect('lobbyMusic.expectedAnswer', 'expectedAnswer')
            .innerJoinAndSelect('expectedAnswer.alternativeNames', 'expectedAnswerAlternativeName')
            // TODO try this to get other games names where the music also appears
            // .innerJoinAndSelect('lobbyMusic.music', 'music')
            // .innerJoinAndMapMany(
            //     'music.games',
            //     GameToMusic,
            //     'gameToMusic',
            //     'music.id = gameToMusic.music',
            // )
            // .innerJoinAndSelect('gameToMusic.game', 'game')
            // .innerJoinAndSelect('game.alternativeNames', 'alternativeName')
            // .andWhere('game.enabled = 1')
            .andWhere('expectedAnswerAlternativeName.enabled = 1')
            // .andWhere('alternativeName.enabled = 1')
            .andWhere('lobbyMusic.lobby = :lobby')
            .andWhere('lobbyMusic.position = :position')
            .setParameter('lobby', lobby.id)
            .setParameter('position', lobby.currentLobbyMusicPosition)
            .getOneOrFail()

        const validAnswers = [
            lobbyMusic.expectedAnswer.name,
            ...lobbyMusic.expectedAnswer.alternativeNames.map((a) => a.name),
        ]

        // lobbyMusic.music.games.forEach((gameToMusic) => {
        //     validAnswers = [
        //         ...validAnswers,
        //         gameToMusic.game.name,
        //         ...gameToMusic.game.alternativeNames.map((a) => a.name),
        //     ]
        // })

        lobbyUser = this.lobbyUserRepository.create({
            ...lobbyUser,
            correctAnswer: validAnswers.includes(answer),
        })
        if (lobbyUser.correctAnswer) {
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

    sendUpdateToRoom(lobby: Lobby): void {
        this.server.to(lobby.code).emit('lobby', lobby)
    }
    sendLobbyMusicToLoad(lobbyMusic: LobbyMusic): void {
        this.server.to(lobbyMusic.lobby.code).emit('lobbyMusic', lobbyMusic.id)
    }

    sendLobbyClosed(lobby: Lobby, message: string): void {
        this.server.to(lobby.code).emit('lobbyClosed', message)
    }
    sendAnswer(lobby: Lobby, game: Game): void {
        this.server.to(lobby.code).emit('lobbyAnswer', game.name)
    }
}
