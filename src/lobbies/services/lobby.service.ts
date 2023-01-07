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
import { IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm'

import { GameToMusic } from '../../games/entity/game-to-music.entity'
import { Game } from '../../games/entity/game.entity'
import { Music } from '../../games/entity/music.entity'
import { User } from '../../users/user.entity'
import { LobbyCreateDto } from '../dto/lobby-create.dto'
import { LobbyMusic } from '../entities/lobby-music.entity'
import { LobbyUser, LobbyUserRole } from '../entities/lobby-user.entity'
import { Lobby } from '../entities/lobby.entity'
import { LobbyGateway } from '../lobby.gateway'

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
            .leftJoinAndSelect('lobby.lobbyMusics', 'lobbyMusic')
            .where('lobby.name LIKE :name')
            .setParameter('name', `%${query}%`)
        return qb.getMany()
    }

    async create(data: LobbyCreateDto, user: User): Promise<Lobby> {
        const lobby = await this.lobbyRepository.save({
            code: await this.generateCode(),
            ...data,
        })
        await this.lobbyUserRepository.save({
            lobby,
            user,
            role: LobbyUserRole.Host,
        })

        return lobby
    }

    async update(lobby: Lobby, data: LobbyCreateDto): Promise<void> {
        lobby = this.lobbyRepository.create({
            ...(await this.lobbyRepository.save({
                ...lobby,
                ...data,
            })),
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
        } while (null !== (await this.lobbyRepository.findOneBy({ code })))

        if (code === '') {
            throw new InternalServerErrorException()
        }
        return code
    }

    async getMusicAccuracyRatio(lobby?: Lobby): Promise<number> {
        const countGameToMusic = await this.gameToMusicRepository.count({
            relations: {
                music: true,
            },
            where: {
                music: {
                    duration: MoreThanOrEqual(lobby ? lobby.guessTime : 5),
                },
            },
        })
        const countGameToMusicWithAccuracy = await this.gameToMusicRepository.count({
            relations: {
                music: true,
            },
            where: {
                music: {
                    duration: MoreThanOrEqual(lobby ? lobby.guessTime : 5),
                },
                guessAccuracy: Not(IsNull()),
            },
        })
        let gameToMusicAccuracyRatio = countGameToMusicWithAccuracy / countGameToMusic
        // force at least a 10% chance of contributing missing data
        if (gameToMusicAccuracyRatio > 0.9) gameToMusicAccuracyRatio = 0.9

        return gameToMusicAccuracyRatio
    }

    getRandomFloat(min: number, max: number, decimals: number): number {
        const str = (Math.random() * (max - min) + min).toFixed(decimals)

        return parseFloat(str)
    }
}
