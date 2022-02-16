import {CACHE_MANAGER, forwardRef, Inject, Injectable, InternalServerErrorException} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Cache } from 'cache-manager'
import { Repository } from 'typeorm'

import { Game } from '../games/entity/game.entity'
import { Music } from '../games/entity/music.entity'
import { LobbyCreateDto } from './dto/lobby-create.dto'
import { LobbyMusic } from './entities/lobby-music.entity'
import { Lobby } from './entities/lobby.entity'
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
        @Inject(forwardRef(() => LobbyGateway))
        private lobbyGateway: LobbyGateway,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
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
}
