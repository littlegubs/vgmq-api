import { openSync, readSync, statSync } from 'fs'

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
import { Brackets, Not, Repository } from 'typeorm'

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
import { Duration } from './mp3'

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
                relations: ['lobby', 'music'],
                where: {
                    lobby: lobby,
                    position: lobby.currentLobbyMusicPosition,
                },
            })
            if (lobbyMusic !== undefined) this.sendLobbyMusicToLoad(lobbyMusic)
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
            .leftJoinAndSelect('expectedAnswer.alternativeNames', 'expectedAnswerAlternativeName')
            .andWhere('expectedAnswer.enabled = 1')
            .andWhere('lobbyMusic.lobby = :lobby', { lobby: lobby.id })
            .andWhere('lobbyMusic.position = :position', {
                position: lobby.currentLobbyMusicPosition,
            })
            .andWhere(
                new Brackets((qb) => {
                    qb.orWhere('expectedAnswer.name LIKE :answer')
                    qb.orWhere(
                        new Brackets((qb2) => {
                            qb2.orWhere('expectedAnswerAlternativeName.enabled IS NULL')
                            qb2.orWhere(
                                'expectedAnswerAlternativeName.enabled = 1 AND expectedAnswerAlternativeName.name LIKE :answer',
                            )
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

    sendUpdateToRoom(lobby: Lobby): void {
        this.server.to(lobby.code).emit('lobby', classToClass<Lobby>(lobby))
    }

    sendLobbyMusicToLoad(lobbyMusic: LobbyMusic): void {
        const music = lobbyMusic.music
        const stat = statSync(music.file.path)
        const size = stat.size
        const { duration, offset } = Duration.getDuration(music.file.path)
        const valuePerSecond = (size - offset) / duration
        const startBit = lobbyMusic.startAt * valuePerSecond
        const endBit = lobbyMusic.endAt * valuePerSecond
        const fd = openSync(music.file.path, 'r')

        const audioBuffer = Buffer.alloc(endBit - startBit)
        readSync(fd, audioBuffer, 0, audioBuffer.length, parseInt(String(startBit + offset)))

        this.server.to(lobbyMusic.lobby.code).emit('lobbyMusic', audioBuffer)
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

    sendAnswer(lobby: Lobby, lobbyMusic: LobbyMusic): void {
        this.server.to(lobby.code).emit(
            'lobbyAnswer',
            classToClass<LobbyMusic>(lobbyMusic, {
                strategy: 'excludeAll',
                groups: ['lobby-answer-reveal'],
            }),
        )
    }
    sendLobbyReset(lobby: Lobby): void {
        this.server.to(lobby.code).emit('lobbyReset', classToClass<Lobby>(lobby))
    }

    sendLobbyToast(lobby: Lobby, message: string): void {
        this.server.to(lobby.code).emit('lobbyToast', message)
    }
}
