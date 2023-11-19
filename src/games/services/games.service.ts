import * as path from 'path'

import {
    DeleteByQueryResponse,
    IndexResponse,
    UpdateByQueryResponse,
} from '@elastic/elasticsearch/lib/api/types'
import { InjectQueue } from '@nestjs/bull'
import { Injectable, NotFoundException } from '@nestjs/common'
import { ElasticsearchService } from '@nestjs/elasticsearch'
import { InjectRepository } from '@nestjs/typeorm'
import { Queue } from 'bull'
import * as mm from 'music-metadata'
import Vibrant = require('node-vibrant')
import { Brackets, Repository } from 'typeorm'

import { File } from '../../entity/file.entity'
import { S3Service } from '../../s3/s3.service'
import { User } from '../../users/user.entity'
import { GameSearchSortBy } from '../dto/games-search.dto'
import { AlternativeName } from '../entity/alternative-name.entity'
import { ColorPalette } from '../entity/color-palette.entity'
import { Cover } from '../entity/cover.entity'
import { GameToMusic } from '../entity/game-to-music.entity'
import { Game } from '../entity/game.entity'
import { Music } from '../entity/music.entity'
import GameNameSearchBody from '../types/game-name-search-body.interface'

@Injectable()
export class GamesService {
    constructor(
        @InjectRepository(Game)
        private gameRepository: Repository<Game>,
        @InjectRepository(Cover)
        private coverRepository: Repository<Cover>,
        @InjectRepository(ColorPalette)
        private colorPaletteRepository: Repository<ColorPalette>,
        @InjectRepository(Music)
        private musicRepository: Repository<Music>,
        @InjectRepository(GameToMusic)
        private gameToMusicRepository: Repository<GameToMusic>,
        @InjectRepository(File)
        private fileRepository: Repository<File>,
        @InjectRepository(AlternativeName)
        private alternativeNameRepository: Repository<AlternativeName>,
        private elasticsearchService: ElasticsearchService,
        private s3Service: S3Service,
        @InjectQueue('game')
        private gameQueue: Queue,
    ) {}
    async findByName(
        query: string,
        options?: {
            showDisabled?: boolean
            onlyShowWithoutMusics?: boolean
            filterByUser?: User
            sortBy: GameSearchSortBy
            limit?: number
            skip?: number
            nsfw?: boolean
        },
    ): Promise<[Game[], number]> {
        const qb = this.gameRepository
            .createQueryBuilder('game')
            .addSelect((sbq) => {
                return sbq
                    .select('COUNT(*)', 'count')
                    .from('user_games', 'ug')
                    .where('ug.gameId = game.id')
            }, 'countUsers')
            .addSelect((sbq) => {
                return sbq
                    .select('COUNT(*)', 'count')
                    .from(GameToMusic, 'gtm')
                    .where('gtm.gameId = game.id')
            }, 'countMusics')
            .leftJoin('game.alternativeNames', 'alternativeName')
            .loadRelationCountAndMap('game.countMusics', 'game.musics', 'countMusics')
            .loadRelationCountAndMap('game.countUsers', 'game.users', 'countUsers')
            .leftJoinAndSelect('game.cover', 'cover')
            .leftJoinAndSelect('cover.colorPalette', 'colorPalette')
            .loadRelationIdAndMap('game.platformIds', 'game.platforms')
            .where(
                new Brackets((qb) => {
                    qb.orWhere('game.name LIKE :name').orWhere(
                        new Brackets((qb) => {
                            qb.andWhere('alternativeName.name LIKE :name').andWhere(
                                'alternativeName.enabled = 1',
                            )
                        }),
                    )
                }),
            )
            .setParameter('name', `%${query}%`)
            .groupBy('game.id')
        if (options?.showDisabled === false) {
            qb.andWhere('game.enabled = 1')
        }

        if (
            options?.onlyShowWithoutMusics !== undefined &&
            options?.onlyShowWithoutMusics !== false
        ) {
            qb.leftJoin('game.musics', 'music').andWhere('music.id IS NULL')
        }

        if (options?.filterByUser instanceof User) {
            qb.leftJoin('game.users', 'user').andWhere('user.id = :userId', {
                userId: options.filterByUser.id,
            })
        }

        if (!options?.nsfw) {
            qb.andWhere('game.nsfw != 1')
        }

        if (options?.sortBy === GameSearchSortBy.NameDesc) {
            qb.addOrderBy('game.name', 'DESC')
        } else {
            switch (options?.sortBy) {
                case GameSearchSortBy.CountUsersAsc:
                    qb.addOrderBy('countUsers', 'ASC')
                    break
                case GameSearchSortBy.CountUsersDesc:
                    qb.addOrderBy('countUsers', 'DESC')
                    break
                case GameSearchSortBy.CountMusicsAsc:
                    qb.addOrderBy('countMusics', 'ASC')
                    break
                case GameSearchSortBy.CountMusicsDesc:
                    qb.addOrderBy('countMusics', 'DESC')
                    break
            }
            qb.addOrderBy('game.name')
        }

        if (options?.limit !== undefined) {
            qb.limit(options?.limit)
        }

        if (options?.skip !== undefined) {
            qb.offset(options?.skip)
        }
        return qb.getManyAndCount()
    }

    async getGamesIdsForUser(user: User): Promise<number[]> {
        const qb = this.gameRepository
            .createQueryBuilder('game')
            .select('game.id')
            .leftJoin('game.users', 'user')
            .andWhere('user.id = :userId', { userId: user.id })
        const rawValues = await qb.getRawMany<{ game_id: number }>()
        return rawValues.map((game) => game.game_id)
    }

    async toggle(slug: string): Promise<Game> {
        const game = await this.gameRepository.findOne({
            relations: {
                alternativeNames: true,
                musics: {
                    derivedGameToMusics: {
                        game: true,
                    },
                    originalGameToMusic: {
                        game: true,
                    },
                },
            },
            where: {
                slug,
            },
        })
        if (game === null) {
            throw new NotFoundException()
        }
        return this.gameRepository.save({ ...game, enabled: !game.enabled })
    }

    async uploadMusics(game: Game, files: Array<Express.Multer.File>): Promise<Game> {
        let musics: GameToMusic[] = []
        let i = 1
        for (const file of files) {
            const metadata = await mm.parseBuffer(file.buffer, file.mimetype, {
                duration: true,
                skipCovers: true,
                skipPostHeaders: true,
            })
            const filePath = `${game.slug}/${Math.random().toString(36).slice(2, 9)}${path.extname(
                file.originalname,
            )}`
            await this.s3Service.putObject(filePath, file.buffer)
            musics = [
                ...musics,
                await this.gameToMusicRepository.save({
                    game: game,
                    music: this.musicRepository.create({
                        title: metadata.common.title ?? file.originalname,
                        artist: metadata.common.artist ?? 'unknown artist',
                        duration: metadata.format.duration,
                        file: this.fileRepository.create({
                            path: filePath,
                            originalFilename: file.originalname,
                            mimeType: file.mimetype,
                            size: file.size,
                        }),
                    }),
                }),
            ]
            i = i + 1
        }
        await this.gameQueue.add('getSimilarGames', game.id, { removeOnComplete: true })
        return { ...game, musics: [...game.musics, ...musics] }
    }

    async populateElasticSearch(): Promise<void> {
        await this.elasticsearchService.indices
            .delete({
                index: 'game_name',
            })
            .catch(() => {})
        await this.elasticsearchService.indices.create({
            index: 'game_name',
            settings: {
                max_ngram_diff: 20,
                analysis: {
                    normalizer: {
                        lobby_autocomplete_normalizer: {
                            type: 'custom',
                            filter: ['lowercase', 'custom_icu_folding'],
                        },
                        lobby_autocomplete_normalizer_slug: {
                            type: 'custom',
                            char_filter: ['my_char_filter'],
                            filter: ['lowercase', 'custom_icu_folding'],
                        },
                    },
                    analyzer: {
                        lobby_autocomplete_analyzer: {
                            type: 'custom',
                            tokenizer: 'lobby_autocomplete_tokenizer',
                            char_filter: ['my_char_filter'],
                            filter: ['lowercase', 'custom_icu_folding'],
                        },
                    },
                    filter: {
                        custom_icu_folding: {
                            type: 'icu_folding',
                            unicode_set_filter: '[^²]',
                        },
                    },
                    char_filter: {
                        my_char_filter: {
                            type: 'pattern_replace',
                            pattern: '([:.,-](\\s*)?)',
                            replacement: ' ',
                        },
                    },
                    tokenizer: {
                        lobby_autocomplete_tokenizer: {
                            type: 'ngram',
                            min_gram: 1,
                            max_gram: 20,
                            token_chars: [],
                        },
                    },
                },
            },
            mappings: {
                properties: {
                    name: {
                        type: 'keyword',
                        normalizer: 'lobby_autocomplete_normalizer',
                        copy_to: ['name_slug', 'suggest_highlight'],
                    },
                    name_slug: {
                        type: 'keyword',
                        normalizer: 'lobby_autocomplete_normalizer_slug',
                    },
                    suggest_highlight: {
                        type: 'text',
                        analyzer: 'lobby_autocomplete_analyzer',
                        term_vector: 'with_positions_offsets',
                        store: true,
                    },
                },
            },
        })
        const games = await this.gameRepository
            .createQueryBuilder('g')
            .select(['g.id', 'g.name'])
            .where('g.enabled = 1')
            .getMany()
        for (const game of games) {
            await this.indexGameName(game)
        }
        const alternativeNames = await this.alternativeNameRepository
            .createQueryBuilder('an')
            .select(['an.id', 'an.name'])
            .where('an.enabled = 1')
            .getMany()
        for (const alternativeName of alternativeNames) {
            await this.indexAlternativeName(alternativeName)
        }
    }

    indexGameName(game: Game): Promise<IndexResponse> {
        return this.elasticsearchService.index<GameNameSearchBody>({
            index: 'game_name',
            body: {
                id: game.id,
                name: game.name,
                type: 'game_name',
            },
        })
    }

    removeGameName(game: Game): Promise<DeleteByQueryResponse> {
        return this.elasticsearchService.deleteByQuery({
            index: 'game_name',
            query: {
                bool: {
                    must: [
                        {
                            match: {
                                id: game.id,
                            },
                        },
                        {
                            match: {
                                type: 'game_name',
                            },
                        },
                    ],
                },
            },
        })
    }

    updateGameName(game: Game): Promise<UpdateByQueryResponse> {
        return this.elasticsearchService.updateByQuery({
            index: 'game_name',
            script: {
                source: `ctx._source["name"] = "${game.name}"`,
            },
            query: {
                bool: {
                    must: [
                        {
                            match: {
                                id: game.id,
                            },
                        },
                        {
                            match: {
                                type: 'game_name',
                            },
                        },
                    ],
                },
            },
        })
    }

    indexAlternativeName(alternativeName: AlternativeName): Promise<IndexResponse> {
        return this.elasticsearchService.index<GameNameSearchBody>({
            index: 'game_name',
            body: {
                id: alternativeName.id,
                name: alternativeName.name,
                type: 'alternative_name',
            },
        })
    }

    removeAlternativeName(alternativeName: AlternativeName): Promise<DeleteByQueryResponse> {
        return this.elasticsearchService.deleteByQuery({
            index: 'game_name',
            query: {
                bool: {
                    must: [
                        {
                            match: {
                                id: alternativeName.id,
                            },
                        },
                        {
                            match: {
                                type: 'alternative_name',
                            },
                        },
                    ],
                },
            },
        })
    }

    updateAlternativeName(alternativeName: AlternativeName): Promise<UpdateByQueryResponse> {
        return this.elasticsearchService.updateByQuery({
            index: 'game_name',
            script: {
                source: `ctx._source["name"] = "${alternativeName.name}"`,
            },
            query: {
                bool: {
                    must: [
                        {
                            match: {
                                id: alternativeName.id,
                            },
                        },
                        {
                            match: {
                                type: 'alternative_name',
                            },
                        },
                    ],
                },
            },
        })
    }

    async updateGameCoverColorPalette(): Promise<void> {
        const covers = await this.coverRepository.find()
        for (const cover of covers) {
            const colorPalette = await Vibrant.from(
                `https://images.igdb.com/igdb/image/upload/t_1080p/${cover.imageId}.jpg`,
            ).getPalette()
            await this.coverRepository.save({
                ...cover,
                colorPalette: this.colorPaletteRepository.create({
                    vibrantHex: colorPalette.Vibrant?.hex,
                    mutedHex: colorPalette.Muted?.hex,
                    darkMutedHex: colorPalette.DarkMuted?.hex,
                    darkVibrantHex: colorPalette.DarkVibrant?.hex,
                    lightMutedHex: colorPalette.LightMuted?.hex,
                    lightVibrantHex: colorPalette.LightVibrant?.hex,
                    backgroundColorHex: colorPalette.DarkVibrant?.hex,
                    colorHex: colorPalette.Vibrant?.hex,
                }),
            })
        }
    }
}
