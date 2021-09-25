import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'

import { Game } from '../entity/game.entity'

@Injectable()
export class GamesService {
    constructor(
        @InjectRepository(Game)
        private gamesRepository: Repository<Game>,
    ) {}
    async findByName(query: string, limit = 50, page = 1): Promise<[Game[], number]> {
        return this.gamesRepository
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
            .take(limit)
            .skip((page - 1) * limit)
            .getManyAndCount()
    }
}
