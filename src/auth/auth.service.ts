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

    public getJwtAccessToken(payload: Record<string, unknown>): string {
        return this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
            expiresIn: ExpireTime.Access,
        })
    }

    public getJwtRefreshToken(payload: Record<string, unknown>): string {
        return this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_REFRESH_TOKEN_SECRET'),
            expiresIn: ExpireTime.Refresh,
        })
    }

    async login(
        authLoginDto: AuthLoginDto,
    ): Promise<{ access_token: string; refresh_token: string }> {
        const user = await this.validateUser(authLoginDto)
        return this.getUserTokens(user)
    }

    async getUserTokens(user: User): Promise<{ access_token: string; refresh_token: string }> {
        const payload = {
            username: user.username,
            roles: user.roles,
        }
        const refreshToken = this.getJwtRefreshToken(payload)
        const currentHashedRefreshToken = await bcrypt.hash(refreshToken, 10)
        await this.usersRepository.update(user.id, {
            currentHashedRefreshToken: currentHashedRefreshToken,
        })

        return {
            access_token: this.getJwtAccessToken(payload),
            refresh_token: refreshToken,
        }
    }

    async validateUser(authLoginDto: AuthLoginDto): Promise<User> {
        const { username, password } = authLoginDto

        const user = await this.usersService.findByUsername(username)

        if (user && (await user.validatePassword(password))) {
            return user
        }

        throw new UnauthorizedException()
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
