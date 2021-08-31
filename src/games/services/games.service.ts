import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AlternativeName } from '../entity/alternative-name.entity'

@Injectable()
export class GamesService {
    constructor(
        @InjectRepository(AlternativeName)
        private alternativeNamesRepository: Repository<AlternativeName>,
    ) {}
    async findByName(query: string) {
        return this.alternativeNamesRepository
            .createQueryBuilder('game')
            .leftJoinAndSelect('alternativeName.game', 'game')
            .where({
                name: query,
                game: {
                    name: query,
                },
            })
            .getMany()
    }
}
