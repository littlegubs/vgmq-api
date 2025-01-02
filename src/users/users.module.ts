import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { OauthPatreon } from '../oauth/entities/oauth-patreon.entity'
import { PatreonService } from '../oauth/services/patreon.service'
import { UserSubscriber } from './subscribers/user.subscriber'
import { User } from './user.entity'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
    controllers: [UsersController],
    imports: [TypeOrmModule.forFeature([User, OauthPatreon]), HttpModule],
    providers: [UsersService, UserSubscriber, PatreonService],
    exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
