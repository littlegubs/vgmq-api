import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'

import { Game } from '../entity/game.entity'

@Injectable()
export class GamesService {
    constructor(
        @InjectRepository(Game)
        private gamesRepository: Repository<Game>,
    ) {}
    async findByName(
        query: string,
        showDisabled = false,
        limit?: number | undefined,
        page?: number | undefined,
    ): Promise<[Game[], number]> {
        const qb = this.gamesRepository
            .createQueryBuilder('game')
            .leftJoinAndSelect('game.alternativeNames', 'alternativeName')
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
        if (!showDisabled) {
            qb.andWhere('game.enabled = 1')
        }

        if (limit !== undefined) {
            qb.take(limit)
        }
        if (limit !== undefined && page !== undefined) {
            qb.skip((page - 1) * limit)
        }
        return qb.getManyAndCount()
    }

    async toggle(slug: string): Promise<Game> {
        const game = await this.gamesRepository.findOne({
            relations: ['alternativeNames'],
            where: {
                slug,
            },
        })
        if (game === undefined) {
            throw new NotFoundException()
        }
        return this.gamesRepository.save({ ...game, enabled: !game.enabled })
    }
}
