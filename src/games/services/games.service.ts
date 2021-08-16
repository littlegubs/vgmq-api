import { Injectable } from '@nestjs/common'

import { AlternativeName } from '../entities/alternative-name.entity'
import { Game } from '../entities/game.entity'

@Injectable()
export class GamesService {
    async findByName(query: string) {
        return AlternativeName.createQueryBuilder('game')
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
