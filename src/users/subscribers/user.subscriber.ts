import { ConfigService } from '@nestjs/config'
import { DateTime } from 'luxon'
import { DataSource, EntitySubscriberInterface, EventSubscriber, UpdateEvent } from 'typeorm'

import { OauthPatreon } from '../../oauth/entities/oauth-patreon.entity'
import { PatreonService } from '../../oauth/services/patreon.service'
import { Role } from '../role.enum'
import { User } from '../user.entity'

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
    constructor(
        private connection: DataSource,
        private configService: ConfigService,
        private patreonService: PatreonService,
    ) {
        connection.subscribers.push(this)
    }

    listenTo(): typeof User {
        return User
    }

    async afterLoad(entity: User): Promise<void> {
        if (
            entity?.premiumCachedAt === null ||
            DateTime.fromJSDate(entity?.premiumCachedAt).diffNow('seconds').negate().seconds >
                2678400 // 30 days
        ) {
            if (entity.patreonAccount) {
                const oauthPatreon = await this.connection.manager.findOne(OauthPatreon, {
                    where: { id: entity.patreonAccount.id },
                })
                if (oauthPatreon) {
                    entity.patreonAccount = await this.patreonService.refreshData(oauthPatreon)
                }
            }
            entity.premium = !!(
                entity.patreonAccount?.currentlyEntitledTiers?.some(
                    (tier) =>
                        tier === this.configService.get('PATREON_TIER_1_ID') ||
                        tier === this.configService.get('PATREON_TIER_2_ID'),
                ) ||
                entity.roles?.some((role) =>
                    [Role.Admin, Role.SuperAdmin].includes(role as Role),
                ) ||
                this.configService
                    .get<string>('PATREON_TIER_1_FREE_ACCESS')
                    ?.split(',')
                    .includes(String(entity.id))
            )
            entity.premiumCachedAt = new Date()
            void this.connection.manager.save(User, entity, { listeners: false })
        }
    }

    async beforeUpdate(event: UpdateEvent<User>): Promise<void> {
        if (event.updatedColumns.some((column) => column.propertyName === 'password')) {
            await event.entity?.hashPassword()
        }
    }
}
