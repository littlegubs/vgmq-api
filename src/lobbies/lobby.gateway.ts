import { openSync, readSync, statSync } from 'fs'

import { InjectQueue } from '@nestjs/bull'
import { forwardRef, Inject, Logger, UseFilters, UseGuards } from '@nestjs/common'
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
import { Server, Socket } from 'socket.io'
import { Brackets, Not, Repository } from 'typeorm'

import { WsExceptionsFilter } from '../auth/exception-filter/ws.exception-filter'
import { WsGuard } from '../auth/guards/ws.guard'
import { Game } from '../games/entity/game.entity'
import { Music } from '../games/entity/music.entity'
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

@UseFilters(WsExceptionsFilter)
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
                socketId: client.id,
            })
        } else {
            // if user was previously in lobby, set them connected
            await this.lobbyUserRepository.save({
                ...lobbyUser,
                disconnected: false,
                status: null,
                socketId: client.id,
            })
        }
        await client.join(lobby.code)
        client.emit('lobbyJoined', classToClass<Lobby>(lobby))

        if (
            [LobbyStatuses.PlayingMusic.toString(), LobbyStatuses.AnswerReveal.toString()].includes(
                lobby.status,
            )
        ) {
            const lobbyMusic = await this.lobbyMusicRepository.findOne({
                relations: ['lobby', 'music', 'expectedAnswer'],
                where: {
                    lobby: lobby,
                    position: lobby.currentLobbyMusicPosition,
                },
            })
            if (lobbyMusic !== undefined) {
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
                    lobby: lobby,
                },
            }),
        )
        const job = await this.lobbyQueue.add('afkWarning', null, { delay: 600000 }) // 10min
        await this.lobbyUserRepository.save({ ...lobbyUser, afkJobId: job.id as string })

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
        await this.lobbyUserRepository.save({ ...lobbyUser, status: null })
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
                    qb.where(
                        new Brackets((qb2) => {
                            qb2.andWhere(
                                new Brackets((qb3) => {
                                    qb3.orWhere('expectedAnswerAlternativeName.enabled IS NULL')
                                    qb3.orWhere('expectedAnswerAlternativeName.enabled = 0')
                                    qb3.orWhere('expectedAnswerAlternativeName.enabled = 1')
                                }),
                            )
                            qb2.andWhere('expectedAnswer.name LIKE :answer')
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

    handleConnection(client: AuthenticatedSocket, ...args: any): any {
        client.on('disconnecting', async (reason) => {
            if (reason === 'server namespace disconnect') {
                return
            }
            if (client.user === undefined) {
                return
            }
            // for some reason I must search by id here?????
            const lobbyUser = await this.lobbyUserRepository.findOne({
                relations: ['user'],
                where: {
                    user: {
                        id: client.user.id,
                    },
                },
            })
            if (lobbyUser === undefined) {
                return
            }
            if (lobbyUser.status === LobbyUserStatus.Reconnecting) {
                // don't disconnect if reconnecting
                return
            }
            if (
                lobbyUser.lobby.status === LobbyStatuses.Waiting ||
                lobbyUser.role === LobbyUserRole.Spectator
            ) {
                await this.lobbyUserRepository.remove(lobbyUser)
            } else {
                await this.lobbyUserRepository.save({ ...lobbyUser, disconnected: true })
            }
        })
    }

    sendUpdateToRoom(lobby: Lobby): void {
        this.server.to(lobby.code).emit('lobby', classToClass<Lobby>(lobby))
    }

    sendLobbyMusicToLoad(lobbyMusic: LobbyMusic, client?: AuthenticatedSocket): void {
        const music = lobbyMusic.music
        const stat = statSync(music.file.path)
        const size = stat.size

        // for some reason, the Duration class returns an incorrect duration value, I'm afraid it might also return an incorrect offset value
        const { offset } = Duration.getDuration(music.file.path)
        const valuePerSecond = (size - offset) / music.duration
        const startBit = lobbyMusic.startAt * valuePerSecond
        const endBit = lobbyMusic.endAt * valuePerSecond
        const fd = openSync(music.file.path, 'r')

        const audioBuffer = Buffer.alloc(endBit - startBit)
        readSync(fd, audioBuffer, 0, audioBuffer.length, parseInt(String(startBit + offset)))

        if (client) {
            client.emit('lobbyMusic', audioBuffer)
        } else {
            this.server.to(lobbyMusic.lobby.code).emit('lobbyMusic', audioBuffer)
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
        this.server.to(lobby.code).emit('lobbyReset', classToClass<Lobby>(lobby))
    }

    sendLobbyToast(lobby: Lobby, message: string): void {
        this.server.to(lobby.code).emit('lobbyToast', message)
    }
}
