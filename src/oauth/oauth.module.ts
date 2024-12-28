import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { User } from '../users/user.entity'
import { OauthPatreon } from './entities/oauth-patreon.entity'
import { OauthController } from './oauth.controller'
import { PatreonService } from './services/patreon.service'
import { OauthPatreonSubscriber } from './subscribers/oauth-patreon.subscriber'

@Module({
    controllers: [OauthController],
    imports: [TypeOrmModule.forFeature([User, OauthPatreon]), HttpModule],
    providers: [PatreonService, OauthPatreonSubscriber],
    exports: [PatreonService],
})
export class OauthModule {}
