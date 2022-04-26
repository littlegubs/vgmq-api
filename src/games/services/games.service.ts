import * as fs from 'fs'
import * as path from 'path'

import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import * as mm from 'music-metadata'
import { Brackets, Repository } from 'typeorm'

import { File } from '../../entity/file.entity'
import { User } from '../../users/user.entity'
import { AlternativeName } from '../entity/alternative-name.entity'
import { GameToMusic } from '../entity/game-to-music.entity'
import { Game } from '../entity/game.entity'
import { Music } from '../entity/music.entity'

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
                    qb.orWhere('REPLACE(REPLACE(game.name, ":", ""), "-", " ") LIKE :name').orWhere(
                        new Brackets((qb) => {
                            qb.andWhere(
                                'REPLACE(REPLACE(alternativeName.name, ":", ""), "-", " ") LIKE :name',
                            ).andWhere('alternativeName.enabled = 1')
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
        if (game === undefined) {
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
            .andWhere('REPLACE(REPLACE(game.name, ":", ""), "-", " ") LIKE :query', {
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
}
