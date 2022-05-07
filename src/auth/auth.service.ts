import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import { Repository } from 'typeorm'

import { User } from '../users/user.entity'
import { UsersService } from '../users/users.service'
import { AuthLoginDto } from './dto/auth-login.dto'

enum ExpireTime {
    Refresh = '30d',
    Access = '1h',
}

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) {}

    public getJwtAccessToken(user: User): string {
        return this.jwtService.sign(this.createUserPayload(user), {
            secret: this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
            expiresIn: ExpireTime.Access,
        })
    }

    public getJwtRefreshToken(user: User): string {
        return this.jwtService.sign(this.createUserPayload(user), {
            secret: this.configService.get('JWT_REFRESH_TOKEN_SECRET'),
            expiresIn: ExpireTime.Refresh,
        })
    }

    createUserPayload(user: User): { roles: string[]; username: string } {
        return {
            username: user.username,
            roles: user.roles,
        }
    }

    async login(
        authLoginDto: AuthLoginDto,
    ): Promise<{ accessToken: string; refreshToken: string }> {
        const user = await this.validateUser(authLoginDto)
        return this.getUserTokens(user)
    }

    async getUserTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
        const refreshToken = this.getJwtRefreshToken(user)
        const currentHashedRefreshToken = await bcrypt.hash(refreshToken, 10)
        await this.usersRepository.update(user.id, {
            currentHashedRefreshToken: currentHashedRefreshToken,
        })

        return {
            accessToken: this.getJwtAccessToken(user),
            refreshToken: refreshToken,
        }
    }

    async validateUser(authLoginDto: AuthLoginDto): Promise<User> {
        const { username, password } = authLoginDto

        const user = await this.usersService.findByUsername(username)

        if (user && (await user.validatePassword(password))) {
            if (!user.enabled) {
                throw new UnauthorizedException(
                    'Your account is disabled, check your emails to activate your account',
                )
            }

            return user
        }

        throw new UnauthorizedException('wrong password')
    }

    async getUserIfRefreshTokenMatches(
        refreshToken: string,
        username: string,
    ): Promise<User | undefined> {
        const user = await this.usersService.findByUsername(username)

        if (!user) return undefined

        const isRefreshTokenMatching = await bcrypt.compare(
            refreshToken,
            user.currentHashedRefreshToken || '',
        )
        return isRefreshTokenMatching ? user : undefined
    }

    async logout(user: User): Promise<void> {
        await this.usersRepository.save({
            ...user,
            currentHashedRefreshToken: null,
        })
    }
}
