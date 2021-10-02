import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AlternativeName } from '../games/entity/alternative-name.entity'

@Injectable()
export class AlternativeNamesService {
    constructor(
        @InjectRepository(AlternativeName)
        private alternativeNameRepository: Repository<AlternativeName>,
    ) {}

    async toggle(id: string): Promise<AlternativeName> {
        const alternativeName = await this.alternativeNameRepository.findOne(id)
        if (alternativeName === undefined) {
            throw new NotFoundException()
        }
        return this.alternativeNameRepository.save({
            ...alternativeName,
            enabled: !alternativeName.enabled,
        })
    }
}
