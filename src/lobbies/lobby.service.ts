import { randomInt } from 'crypto'
import { statSync } from 'fs'

import { InjectQueue } from '@nestjs/bull'
import {
    CACHE_MANAGER,
    forwardRef,
    Inject,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Queue } from 'bull'
import { Cache } from 'cache-manager'
import { In, Repository } from 'typeorm'

import { GameToMusic } from '../games/entity/game-to-music.entity'
import { Game } from '../games/entity/game.entity'
import { Music } from '../games/entity/music.entity'
import { User } from '../users/user.entity'
import { LobbyCreateDto } from './dto/lobby-create.dto'
import { LobbyMusic } from './entities/lobby-music.entity'
import { LobbyUser, LobbyUserRole } from './entities/lobby-user.entity'
import { Lobby, LobbyStatuses } from './entities/lobby.entity'
import { LobbyGateway } from './events/lobby.gateway'

@Injectable()
export class LobbyService {
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
        @InjectRepository(GameToMusic)
        private gameToMusicRepository: Repository<GameToMusic>,
        @Inject(forwardRef(() => LobbyGateway))
        private lobbyGateway: LobbyGateway,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        @InjectQueue('lobby')
        private lobbyQueue: Queue,
    ) {}
    async findByName(query: string): Promise<Lobby[]> {
        const qb = this.lobbyRepository
            .createQueryBuilder('lobby')
            .where('lobby.name LIKE :name')
            .setParameter('name', `%${query}%`)
        return qb.getMany()
    }

    async create(data: LobbyCreateDto): Promise<Lobby> {
        return this.lobbyRepository.save({
            code: await this.generateCode(),
            name: data.name,
            password: data.password,
            musicNumber: data.musicNumber,
        })
    }

    async update(lobby: Lobby, data: LobbyCreateDto): Promise<void> {
        lobby = await this.lobbyRepository.save({
            ...lobby,
            name: data.name,
            password: data.password,
            musicNumber: data.musicNumber,
        })

        this.lobbyGateway.sendUpdateToRoom(lobby)
    }

    async generateCode(): Promise<string> {
        const str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
        let code = ''
        do {
            for (let i = 0; i < 4; i++) {
                code += str[Math.floor(Math.random() * str.length)]
            }
        } while (undefined !== (await this.lobbyRepository.findOne({ code })))

        if (code === '') {
            throw new InternalServerErrorException()
        }
        return code
    }

    async join(lobby: Lobby, user: User) {
        //search lobby where user is already connected in
        const currentLobby = await this.lobbyUserRepository.findOne({
            relations: ['user', 'lobby'],
            where: {
                user: user,
            },
        })
        if (currentLobby !== undefined && currentLobby.lobby.code !== lobby.code) {
            await this.lobbyRepository.remove(currentLobby.lobby)
        }
        const player = await this.lobbyUserRepository.findOne({
            relations: ['user'],
            where: {
                user: user,
            },
        })
        if (player === undefined) {
            const players = await this.lobbyUserRepository.find({
                lobby: lobby,
            })
            await this.lobbyUserRepository.save({
                lobby: lobby,
                user: user,
                role: players.length === 0 ? LobbyUserRole.Host : LobbyUserRole.Player,
            })
        }
    }

    async loadMusics(lobby: Lobby): Promise<void> {
        const players = await this.lobbyUserRepository.find({
            relations: ['user'],
            where: {
                lobby: lobby,
                role: In([LobbyUserRole.Player, LobbyUserRole.Host]),
            },
        })

        if (players === undefined || players.length === 0) {
            lobby = this.lobbyRepository.create({ ...lobby, status: LobbyStatuses.Waiting })
            await this.lobbyRepository.save(lobby)
            this.lobbyGateway.sendUpdateToRoom(lobby)
            throw new InternalServerErrorException()
        }

        const users = players.map((player) => player.user)

        // find a better way to do all this
        const games = await this.gameRepository
            .createQueryBuilder('game')
            [lobby.allowDuplicates ? 'innerJoinAndSelect' : 'innerJoin'](
                'game.musics',
                'gameToMusic',
            )
            [lobby.allowDuplicates ? 'innerJoinAndSelect' : 'innerJoin'](
                'gameToMusic.music',
                'music',
            )
            .innerJoin('game.users', 'user')
            .andWhere('game.enabled = 1')
            .andWhere('user.id in (:ids)')
            .andWhere('music.duration > :guessTime')
            .setParameter(
                'ids',
                users.map((user) => user.id),
            )
            .setParameter('guessTime', lobby.guessTime)
            .orderBy('RAND()')
            .limit(lobby.musicNumber)
            .getMany()

        let lobbyMusics: LobbyMusic[] = []
        let position = 0
        for (const game of games) {
            let gamesToMusics: GameToMusic[] | undefined = game.musics
            if (gamesToMusics === undefined) {
                const gameToMusic = await this.gameToMusicRepository.findOne({
                    relations: ['music'],
                    where: {
                        game,
                    },
                })
                if (gameToMusic) gamesToMusics = [gameToMusic]
            }
            for (const gameToMusic of gamesToMusics) {
                position += 1
                const music = gameToMusic.music
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
                        position,
                        startAt,
                        endAt,
                        expectedAnswer: game,
                    }),
                ]
            }
        }
        if (lobbyMusics.length === 0) {
            lobby = this.lobbyRepository.create({ ...lobby, status: LobbyStatuses.Waiting })
            await this.lobbyRepository.save(lobby)
            this.lobbyGateway.sendUpdateToRoom(lobby)

            return
        }
        lobby = this.lobbyRepository.create({ ...lobby, status: LobbyStatuses.Playing })
        await this.lobbyMusicRepository.save(lobbyMusics)
        await this.lobbyRepository.save(lobby)
        console.log('???')
        await this.lobbyQueue.add('playMusic', lobby)
        console.log('???2')
    }
}
