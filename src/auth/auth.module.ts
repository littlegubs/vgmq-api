import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'

import { UserExistsRule } from '../users/unique.validator'
import { UsersModule } from '../users/users.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { WsExceptionsFilter } from './exception-filter/ws.exception-filter'
import { JwtRefreshTokenStrategy } from './strategies/jwt-refresh-token.strategy'
import { JwtStrategy } from './strategies/jwt.strategy'
import { WsStrategy } from './strategies/ws.strategy'

@Module({
    controllers: [AuthController],
    imports: [
        PassportModule.register({
            defaultStrategy: 'jwt',
            property: 'user',
        }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: () => {
                return {
                    secret: process.env.JWT_SECRET,
                }
            },
        }),
        UsersModule,
        HttpModule,
    ],
    providers: [
        AuthService,
        ConfigService,
        JwtStrategy,
        JwtRefreshTokenStrategy,
        WsStrategy,
        UserExistsRule,
        WsExceptionsFilter,
    ],
    exports: [AuthService],
})
export class AuthModule {}
