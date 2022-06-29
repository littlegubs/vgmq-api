import * as fs from 'fs'
import * as path from 'path'

import { DeleteByQueryResponse, IndexResponse } from '@elastic/elasticsearch/lib/api/types'
import { Injectable, NotFoundException } from '@nestjs/common'
import { ElasticsearchService } from '@nestjs/elasticsearch'
import { InjectRepository } from '@nestjs/typeorm'
import * as mm from 'music-metadata'
import { Brackets, Repository } from 'typeorm'

import { File } from '../../entity/file.entity'
import { User } from '../../users/user.entity'
import { AlternativeName } from '../entity/alternative-name.entity'
import { GameToMusic } from '../entity/game-to-music.entity'
import { Game } from '../entity/game.entity'
import { Music } from '../entity/music.entity'
import GameNameSearchBody from '../types/game-name-search-body.interface'

@Injectable()
export class GamesService {
    constructor(
        @InjectRepository(Game)
        private gameRepository: Repository<Game>,
        @InjectRepository(Music)
        private musicRepository: Repository<Music>,
        @InjectRepository(GameToMusic)
        private gameToMusicRepository: Repository<GameToMusic>,
        @InjectRepository(File)
        private fileRepository: Repository<File>,
        @InjectRepository(AlternativeName)
        private alternativeNameRepository: Repository<AlternativeName>,
        private elasticsearchService: ElasticsearchService,
    ) {}
    async findByName(
        query: string,
        options?: {
            showDisabled?: boolean
            onlyShowWithoutMusics?: boolean
            filterByUser?: User
            limit?: number
            skip?: number
        },
    ): Promise<[Game[], number]> {
        const qb = this.gameRepository
            .createQueryBuilder('game')
            .leftJoin('game.alternativeNames', 'alternativeName')
            .loadRelationCountAndMap('game.countMusics', 'game.musics', 'countMusics')
            .loadRelationCountAndMap('game.countUsers', 'game.users', 'countUsers')
            .leftJoinAndSelect('game.cover', 'cover')
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
            .orderBy('game.name')
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
            relations: ['alternativeNames'],
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

            const dir = `./upload/${game.slug}`
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir)
            }
            const filePath = `${dir}/${Math.random().toString(36).substr(2, 9)}${path.extname(
                file.originalname,
            )}`
            fs.writeFileSync(filePath, file.buffer)
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
        return { ...game, musics: [...game.musics, ...musics] }
    }

    async getNamesForQuery(query: string): Promise<string[]> {
        const games = await this.gameRepository
            .createQueryBuilder('game')
            .andWhere('game.enabled = 1')
            .andWhere('game.name LIKE REPLACE(REPLACE(:query, ":", "_"), "-", "_") ', {
                query: `%${query}%`,
            })
            .orderBy('game.name')
            .getMany()

        const alternativeNames = await this.alternativeNameRepository
            .createQueryBuilder('alternativeName')
            .andWhere('alternativeName.enabled = 1')
            .andWhere('REPLACE(REPLACE(alternativeName.name, ":", ""), "-", " ") LIKE :query', {
                query: `%${query}%`,
            })
            .orderBy('alternativeName.name')
            .getMany()

        return [
            ...new Set([...games.map((g) => g.name), ...alternativeNames.map((a) => a.name)]),
        ].sort((a, b) => a.localeCompare(b))
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
                            filter: ['lowercase', 'asciifolding'],
                        },
                        lobby_autocomplete_normalizer_slug: {
                            type: 'custom',
                            char_filter: ['my_char_filter'],
                            filter: ['lowercase', 'asciifolding'],
                        },
                    },
                    analyzer: {
                        lobby_autocomplete_analyzer: {
                            type: 'custom',
                            tokenizer: 'lobby_autocomplete_tokenizer',
                            char_filter: ['my_char_filter'],
                            filter: ['lowercase', 'asciifolding'],
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
}
