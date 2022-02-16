import { randomInt } from 'crypto'
import { statSync } from 'fs'

import { InjectQueue } from '@nestjs/bull'
import {
    CACHE_MANAGER,
    ClassSerializerInterceptor,
    forwardRef,
    Inject,
    InternalServerErrorException,
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
import { Repository } from 'typeorm'

import { WsExceptionsFilter } from '../../auth/exception-filter/ws.exception-filter'
import { WsGuard } from '../../auth/guards/ws.guard'
import { Game } from '../../games/entity/game.entity'
import { Music } from '../../games/entity/music.entity'
import { User } from '../../users/user.entity'
import { LobbyMusic } from '../entities/lobby-music.entity'
import { LobbyUser, LobbyUserRole } from '../entities/lobby-user.entity'
import { Lobby, LobbyStatuses } from '../entities/lobby.entity'
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
        @MessageBody() code: string,
    ): Promise<undefined> {
        const lobby = await this.lobbyRepository.findOne({
            code,
        })
        if (lobby === undefined) {
            throw new WsException('Not found')
        }
        await client.join(code)

        const players: LobbyUser[] | undefined = await this.cacheManager.get(`${code}_players`)

        const player = new LobbyUser({
            user: client.user,
            role:
                players === undefined || players.length === 0
                    ? LobbyUserRole.Host
                    : LobbyUserRole.Player,
        })
        const playerAlreadyInLobby = players?.find((p) => p.user.username === player.user.username)
        if (playerAlreadyInLobby === undefined) {
            await this.cacheManager.set(`${code}_players`, [...(players ? players : []), player], {
                ttl: 3600,
            })
        } else {
            await this.cacheManager.set(`${code}_players`, players, {
                ttl: 3600,
            })
        }

        client.emit('lobbyJoined', lobby)
        this.server.to(code).emit(
            'userJoined',
            classToClass<LobbyUser[] | undefined>(await this.cacheManager.get(`${code}_players`), {
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
        let lobby = await this.lobbyRepository.findOne({
            code,
        })
        if (lobby === undefined) {
            throw new WsException('Not found')
        }
        lobby = this.lobbyRepository.create({ ...lobby, status: LobbyStatuses.Loading })
        await this.lobbyRepository.save(lobby)
        this.sendUpdateToRoom(lobby)
        await this.loadMusics(lobby)
    }

    sendUpdateToRoom(lobby: Lobby): void {
        this.server.to(lobby.code).emit('lobby', lobby)
    }
    async loadMusics(lobby: Lobby): Promise<void> {
        const players: LobbyUser[] | undefined = await this.cacheManager.get(
            `${lobby.code}_players`,
        )

        if (players === undefined || players.length === 0) {
            lobby = this.lobbyRepository.create({ ...lobby, status: LobbyStatuses.Waiting })
            await this.lobbyRepository.save(lobby)
            this.sendUpdateToRoom(lobby)
            throw new InternalServerErrorException()
        }

        const users = players.map((player) => player.user)

        // do something about duplicate (don't take from old code, it's bad)
        const musics = await this.musicRepository
            .createQueryBuilder('music')
            .leftJoinAndSelect('music.file', 'f')
            .innerJoin('music.games', 'gameToMusic')
            .leftJoin('gameToMusic.game', 'game')
            .leftJoin('game.users', 'user')
            .andWhere('music.duration > :guessTime')
            .setParameter('guessTime', lobby.guessTime)
            .andWhere('user.id in (:ids)')
            .setParameter(
                'ids',
                users.map((user) => user.id),
            )
            .orderBy('RAND()')
            .limit(lobby.musicNumber)
            .getMany()

        let lobbyMusics: LobbyMusic[] = []
        for (const [index, music] of musics.entries()) {
            const stat = statSync(music.file.path)
            let startAt = 0
            let endAt = Math.ceil((stat.size * lobby.guessTime) / music.duration)
            const contentLength = endAt - startAt + 1
            endAt = randomInt(endAt, stat.size)
            startAt = endAt - contentLength + 1
            lobbyMusics = [
                ...lobbyMusics,
                this.lobbyMusicRepository.create({
                    lobby,
                    music,
                    position: index + 1,
                    startAt: startAt,
                    endAt: endAt,
                }),
            ]
        }

        if (lobbyMusics.length === 0) {
            lobby = this.lobbyRepository.create({ ...lobby, status: LobbyStatuses.Waiting })
            await this.lobbyRepository.save(lobby)
            this.sendUpdateToRoom(lobby)

            return
        }
        lobby = this.lobbyRepository.create({ ...lobby, status: LobbyStatuses.Playing })
        await this.lobbyMusicRepository.save(lobbyMusics)
        await this.lobbyRepository.save(lobby)

        await this.lobbyQueue.add('playMusic', lobby)
    }
}
