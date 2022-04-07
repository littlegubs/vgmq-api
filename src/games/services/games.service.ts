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
            page?: number
        },
    ): Promise<[Game[], number]> {
        const qb = this.gameRepository
            .createQueryBuilder('game')
            .leftJoinAndSelect('game.alternativeNames', 'alternativeName')
            .leftJoinAndSelect('game.musics', 'musics')
            .leftJoinAndSelect('game.cover', 'cover')
            .leftJoinAndSelect('game.users', 'user')
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
        if (options?.showDisabled === false) {
            qb.andWhere('game.enabled = 1')
        }
        if (options?.onlyShowWithoutMusics !== false) {
            qb.andWhere('musics.id IS NULL')
        }

        if (options?.filterByUser instanceof User) {
            qb.andWhere('user.id = :userId').setParameter('userId', options.filterByUser.id)
        }

        if (options?.limit !== undefined) {
            qb.take(options?.limit)
        }
        if (options?.limit !== undefined && options?.page !== undefined) {
            qb.skip((options?.page - 1) * options?.limit)
        }
        return qb.getManyAndCount()
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
            .getMany()

        const alternativeNames = await this.alternativeNameRepository
            .createQueryBuilder('alternativeName')
            .andWhere('alternativeName.enabled = 1')
            .andWhere('REPLACE(REPLACE(alternativeName.name, ":", ""), "-", " ") LIKE :query', {
                query: `%${query}%`,
            })
            .getMany()

        return [...games.map((g) => g.name), ...alternativeNames.map((a) => a.name)]
    }
}
