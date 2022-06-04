import { ElasticsearchService } from '@nestjs/elasticsearch'
import {
    Connection,
    EntitySubscriberInterface,
    EventSubscriber,
    InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm'

import { AlternativeName } from '../entity/alternative-name.entity'
import { GamesService } from '../services/games.service'

@EventSubscriber()
export class AlternativeNameSubscriber implements EntitySubscriberInterface<AlternativeName> {
    constructor(
        connection: Connection,
        private elasticsearchService: ElasticsearchService,
        private gameService: GamesService,
    ) {
        connection.subscribers.push(this)
    }

    listenTo(): typeof AlternativeName {
        return AlternativeName
    }

    async afterInsert(event: InsertEvent<AlternativeName>): Promise<void> {
        if (event.entity.enabled) {
            await this.gameService.indexAlternativeName(event.entity)
        }
    }

    async afterUpdate(event: UpdateEvent<AlternativeName>): Promise<void> {
        if (event.updatedColumns.some((column) => column.propertyName === 'enabled')) {
            if (event.entity?.enabled === false) {
                await this.gameService.removeAlternativeName(event.entity as AlternativeName)
            } else if (event.entity?.enabled === true) {
                await this.gameService.indexAlternativeName(event.entity as AlternativeName)
            }
        }
    }
    async afterRemove(event: RemoveEvent<AlternativeName>): Promise<void> {
        if (event.entity) {
            await this.gameService.removeAlternativeName(event.entity)
        }
    }
}
