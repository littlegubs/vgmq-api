import { ConfigService } from '@nestjs/config'
import { DataSource, EntitySubscriberInterface, EventSubscriber, UpdateEvent } from 'typeorm'

import { Role } from '../role.enum'
import { User } from '../user.entity'

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
    constructor(connection: DataSource, private configService: ConfigService) {
        connection.subscribers.push(this)
    }

    listenTo(): typeof User {
        return User
    }

    afterLoad(entity: User): void {
        if (
            !!entity.patreonAccount?.premium ||
            entity.roles?.some((role) => [Role.Admin, Role.SuperAdmin].includes(role as Role)) ||
            this.configService
                .get<string>('PATREON_TIER_1_FREE_ACCESS')
                ?.split(',')
                .includes(String(entity.id))
        ) {
            entity.premium = true
        }
    }

    async beforeUpdate(event: UpdateEvent<User>): Promise<void> {
        if (event.updatedColumns.some((column) => column.propertyName === 'password')) {
            await event.entity?.hashPassword()
        }
    }
}
