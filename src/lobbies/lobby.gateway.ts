import { InjectQueue } from '@nestjs/bull'
import { forwardRef, Inject, Logger, UseFilters, UseGuards } from '@nestjs/common'
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
import { classToClass } from 'class-transformer'
import { Server, Socket } from 'socket.io'
import { Not, Repository } from 'typeorm'

import { WsExceptionsFilter } from '../auth/exception-filter/ws.exception-filter'
import { WsGuard } from '../auth/guards/ws.guard'
import { Game } from '../games/entity/game.entity'
import { Music } from '../games/entity/music.entity'
import { User } from '../users/user.entity'
import { LobbyMusic } from './entities/lobby-music.entity'
import { LobbyUser, LobbyUserRole } from './entities/lobby-user.entity'
import { Lobby, LobbyStatuses } from './entities/lobby.entity'
import { InvalidPasswordException } from './exceptions/invalid-password.exception'
import { MissingPasswordException } from './exceptions/missing-password.exception'
import { LobbyService } from './lobby.service'

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
        @InjectQueue('lobby') private lobbyQueue: Queue,
        @Inject(forwardRef(() => LobbyService))
        private lobbyService: LobbyService,
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
        if (lobby === undefined) {
            throw new WsException('Not found')
        }
        const lobbyUser = await this.lobbyUserRepository.findOne({
            relations: ['user', 'lobby'],
            where: {
                user: client.user,
                lobby,
            },
        })
        if (lobbyUser === undefined) {
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
            await this.lobbyUserRepository.save({ ...lobbyUser, disconnected: false })
        }
        await client.join(lobby.code)
        client.emit('lobbyJoined', classToClass<Lobby>(lobby))

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

        this.sendLobbyUsers(
            lobby,
            await this.lobbyUserRepository.find({
                relations: ['user'],
                where: {
                    lobby: lobby,
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
        if (lobby === undefined) {
            throw new WsException('Not found')
        }
        const lobbyUser = await this.lobbyUserRepository.findOne({
            relations: ['user', 'lobby'],
            where: {
                user: client.user,
                lobby,
            },
        })
        if (lobbyUser === undefined) {
            throw new WsException('Not found')
        }
        await client.join(lobby.code)
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

    @SubscribeMessage('answer')
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

    sendUpdateToRoom(lobby: Lobby): void {
        this.server.to(lobby.code).emit('lobby', classToClass<Lobby>(lobby))
    }
    sendLobbyMusicToLoad(lobbyMusic: LobbyMusic): void {
        this.server.to(lobbyMusic.lobby.code).emit('lobbyMusic', lobbyMusic.id)
    }

    sendLobbyClosed(lobby: Lobby, message: string): void {
        this.server.to(lobby.code).emit('lobbyClosed', message)
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

    sendAnswer(lobby: Lobby, game: Game): void {
        this.server.to(lobby.code).emit('lobbyAnswer', game.name)
    }
    sendLobbyReset(lobby: Lobby): void {
        this.server.to(lobby.code).emit('lobbyReset', classToClass<Lobby>(lobby))
    }
}
