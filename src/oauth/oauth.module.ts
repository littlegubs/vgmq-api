import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AuthModule } from '../auth/auth.module'
import { User } from '../users/user.entity'
import { OauthPatreon } from './entities/oauth-patreon.entity'
import { OauthController } from './oauth.controller'
import { PatreonService } from './services/patreon.service'
import { GoogleStrategy } from './strategies/google.strategy'

@Module({
    controllers: [OauthController],
    imports: [TypeOrmModule.forFeature([User, OauthPatreon]), HttpModule, AuthModule],
    providers: [PatreonService, GoogleStrategy],
    exports: [PatreonService],
})
export class OauthModule {}
