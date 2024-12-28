import { ConfigService } from '@nestjs/config'
import { DataSource, EntitySubscriberInterface, EventSubscriber } from 'typeorm'

import { OauthPatreon } from '../entities/oauth-patreon.entity'

@EventSubscriber()
export class OauthPatreonSubscriber implements EntitySubscriberInterface<OauthPatreon> {
    constructor(connection: DataSource, private configService: ConfigService) {
        connection.subscribers.push(this)
    }

    listenTo(): typeof OauthPatreon {
        return OauthPatreon
    }

    afterLoad(entity: OauthPatreon): void {
        if (
            entity.currentlyEntitledTiers.some(
                (tier) =>
                    tier === this.configService.get('PATREON_TIER_1_ID') ||
                    tier === this.configService.get('PATREON_TIER_2_ID'),
            )
        ) {
            entity.premium = true
        }
    }
}
