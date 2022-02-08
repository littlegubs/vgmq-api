import {
    CACHE_MANAGER,
    ClassSerializerInterceptor,
    Inject,
    InternalServerErrorException,
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
        const games = await this.gameRepository
            .createQueryBuilder('game')
            .innerJoin('game.musics', 'music')
            .leftJoin('game.users', 'user')
            .where('user.id in (:ids)')
            .setParameter(
                'ids',
                users.map((user) => user.id),
            )
            .orderBy('RAND()')
            .limit(lobby.musicNumber)
            .getMany()

        console.log(games)

        let lobbyMusics: LobbyMusic[] = []
        for (const [index, game] of games.entries()) {
            const music = await this.musicRepository
                .createQueryBuilder('music')
                .leftJoin('music.games', 'gameToMusic')
                .leftJoin('gameToMusic.game', 'game')
                .andWhere('game.id = :id')
                .andWhere('music.duration > :guessTime')
                .setParameter('id', game.id)
                .setParameter('guessTime', lobby.guessTime)
                .orderBy('RAND()')
                .limit(1)
                .getOne()

            if (music !== undefined) {
                lobbyMusics = [
                    ...lobbyMusics,
                    this.lobbyMusicRepository.create({
                        lobby,
                        music,
                        position: index + 1,
                    }),
                ]
            }
        }
        console.log(lobbyMusics)
        if (lobbyMusics.length === 0) {
            lobby = this.lobbyRepository.create({ ...lobby, status: LobbyStatuses.Waiting })
            await this.lobbyRepository.save(lobby)
            this.sendUpdateToRoom(lobby)
        }
    }
}
