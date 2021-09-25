import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'

import { LimitedAccessGuard } from '../limited-access/guards/limited-access.guard'
import { User } from '../users/user.entity'
import { UsersService } from '../users/users.service'
import { AuthService } from './auth.service'
import { AuthLoginDto } from './dto/auth-login.dto'
import { AuthRegisterDto } from './dto/auth-register.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { JwtRefreshGuard } from './guards/jwt-refresh.guard'

@Controller('auth')
export class AuthController {
    constructor(private readonly usersService: UsersService, private authService: AuthService) {}

    @Post('register')
    @UseGuards(LimitedAccessGuard)
    async register(
        @Body() createUserDto: AuthRegisterDto,
    ): Promise<{ accessToken: string; refreshToken: string }> {
        const user = await this.usersService.create(createUserDto)
        return this.authService.getUserTokens(user)
    }

    @Post('login')
    @HttpCode(200)
    async login(
        @Body() authLoginDto: AuthLoginDto,
    ): Promise<{ accessToken: string; refreshToken: string }> {
        return this.authService.login(authLoginDto)
    }

    @UseGuards(JwtRefreshGuard)
    @Post('refresh')
    @HttpCode(200)
    refresh(@Req() request: Request): { accessToken: string } {
        return {
            accessToken: this.authService.getJwtAccessToken(<User>request.user),
        }
    }

    @UseGuards(JwtAuthGuard)
    @Get('logout')
    async logout(@Req() request: Request): Promise<void> {
        await this.authService.logout(request.user as User)
    }
}
