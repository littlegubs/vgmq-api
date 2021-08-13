import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'

import { UsersModule } from '../users/users.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtRefreshTokenStrategy } from './strategies/jwt-refresh-token.strategy'
import { JwtStrategy } from './strategies/jwt.strategy'

@Module({
    controllers: [AuthController],
    imports: [
        PassportModule.register({
            defaultStrategy: 'jwt',
            property: 'user',
        }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async () => {
                return {
                    secret: process.env.JWT_SECRET,
                }
            },
        }),
        UsersModule,
    ],
    providers: [AuthService, ConfigService, JwtStrategy, JwtRefreshTokenStrategy],
})
export class AuthModule {}
