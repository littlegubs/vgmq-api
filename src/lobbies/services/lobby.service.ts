import { forwardRef, Inject, Injectable, InternalServerErrorException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm'

import { Collection } from '../../games/entity/collection.entity'
import { GameToMusic } from '../../games/entity/game-to-music.entity'
import { Genre } from '../../games/entity/genre.entity'
import { Theme } from '../../games/entity/theme.entity'
import { Role } from '../../users/role.enum'
import { User } from '../../users/user.entity'
import { LobbyCreateDto } from '../dto/lobby-create.dto'
import { LobbyCollectionFilter } from '../entities/lobby-collection-filter.entity'
import { LobbyGenreFilter } from '../entities/lobby-genre-filter.entity'
import { LobbyThemeFilter } from '../entities/lobby-theme-filter.entity'
import { LobbyUser, LobbyUserRole } from '../entities/lobby-user.entity'
import { Lobby } from '../entities/lobby.entity'
import { LobbyGateway } from '../lobby.gateway'

@Injectable()
export class LobbyService {
    constructor(
        @InjectRepository(Lobby) private lobbyRepository: Repository<Lobby>,
        @InjectRepository(LobbyUser) private lobbyUserRepository: Repository<LobbyUser>,
        @InjectRepository(GameToMusic) private gameToMusicRepository: Repository<GameToMusic>,
        @InjectRepository(Collection) private collectionRepository: Repository<Collection>,
        @InjectRepository(Genre) private genreRepository: Repository<Genre>,
        @InjectRepository(Theme) private themeRepository: Repository<Theme>,
        @InjectRepository(LobbyCollectionFilter)
        private collectionFilterRepository: Repository<LobbyCollectionFilter>,
        @InjectRepository(LobbyGenreFilter)
        private genreFilterRepository: Repository<LobbyGenreFilter>,
        @InjectRepository(LobbyThemeFilter)
        private themeFilterRepository: Repository<LobbyThemeFilter>,
        @Inject(forwardRef(() => LobbyGateway)) private lobbyGateway: LobbyGateway,
    ) {}
    async findByName(query: string): Promise<Lobby[]> {
        const qb = this.lobbyRepository
            .createQueryBuilder('lobby')
            .leftJoinAndSelect('lobby.lobbyMusics', 'lobbyMusic')
            .leftJoinAndSelect('lobby.lobbyUsers', 'lobbyUser')
            .where('lobby.name LIKE :name')
            .setParameter('name', `%${query}%`)
        return qb.getMany()
    }

    async create(data: LobbyCreateDto, user: User): Promise<Lobby> {
        const lobby = await this.lobbyRepository.save({
            code: await this.generateCode(),
            ...data,
            premium: this.isLobbyPremium(user),
            collectionFilters: await this.handleCollectionFilter(data.collectionFilters),
            genreFilters: await this.handleGenreFilter(data.genreFilters),
            themeFilters: await this.handleThemeFilter(data.themeFilters),
        })
        await this.lobbyUserRepository.save({
            lobby,
            user,
            role: LobbyUserRole.Host,
            lastAnswerAt: new Date(),
        })

        return lobby
    }

    async update(lobby: Lobby, data: LobbyCreateDto, user: User): Promise<void> {
        lobby = this.lobbyRepository.create({
            ...(await this.lobbyRepository.save({
                ...lobby,
                ...data,
                collectionFilters: await this.handleCollectionFilter(data.collectionFilters),
                genreFilters: await this.handleGenreFilter(data.genreFilters),
                themeFilters: await this.handleThemeFilter(data.themeFilters),
            })),
        })

        this.lobbyGateway.sendUpdateToRoom(lobby)
    }

    private async handleCollectionFilter(
        data: LobbyCreateDto['collectionFilters'],
    ): Promise<Awaited<LobbyCollectionFilter>[]> {
        return Promise.all(
            data.map(async (collectionFilter) => {
                const collection = await this.collectionRepository.findOneBy({
                    id: collectionFilter.id,
                })
                if (collection === null) {
                    throw new Error('Collection not found')
                }
                return this.collectionFilterRepository.create({
                    collection,
                    type: collectionFilter.type,
                    limitation: collectionFilter.limitation,
                })
            }),
        )
    }

    private async handleGenreFilter(
        data: LobbyCreateDto['genreFilters'],
    ): Promise<Awaited<LobbyGenreFilter>[]> {
        return Promise.all(
            data.map(async (genreFilter) => {
                const genre = await this.genreRepository.findOneBy({
                    id: genreFilter.id,
                })
                if (genre === null) {
                    throw new Error('Genre not found')
                }
                return this.genreFilterRepository.create({
                    genre,
                    type: genreFilter.type,
                    limitation: genreFilter.limitation,
                })
            }),
        )
    }

    private async handleThemeFilter(
        data: LobbyCreateDto['themeFilters'],
    ): Promise<Awaited<LobbyThemeFilter>[]> {
        return Promise.all(
            data.map(async (genreFilter) => {
                const theme = await this.themeRepository.findOneBy({
                    id: genreFilter.id,
                })
                if (theme === null) {
                    throw new Error('Theme not found')
                }
                return this.themeFilterRepository.create({
                    theme,
                    type: genreFilter.type,
                    limitation: genreFilter.limitation,
                })
            }),
        )
    }

    private isLobbyPremium(user: User): boolean {
        return (
            !!user.patreonAccount?.premium ||
            user.roles.some((role) => [Role.Admin, Role.SuperAdmin].includes(role as Role))
        )
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
