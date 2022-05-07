import {
    BadRequestException,
    Body,
    Controller,
    Get,
    HttpCode,
    NotFoundException,
    Param,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Request } from 'express'
import { Repository } from 'typeorm'

import { LimitedAccessGuard } from '../limited-access/guards/limited-access.guard'
import { User } from '../users/user.entity'
import { UsersService } from '../users/users.service'
import { AuthService } from './auth.service'
import { AuthLoginDto } from './dto/auth-login.dto'
import { AuthRegisterDto } from './dto/auth-register.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { JwtRefreshGuard } from './guards/jwt-refresh.guard'
import { RecaptchaGuard } from './guards/recaptcha.guard'

@Controller('auth')
export class AuthController {
    constructor(
        private readonly usersService: UsersService,
        private authService: AuthService,
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) {}

    @Post('register')
    @UseGuards(RecaptchaGuard, LimitedAccessGuard)
    async register(@Body() createUserDto: AuthRegisterDto): Promise<void> {
        return this.usersService.create(createUserDto)
    }

    @UseGuards(RecaptchaGuard)
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

    @Get('confirmation/:token')
    @HttpCode(200)
    async confirmation(
        @Param('token') token: string,
    ): Promise<{ accessToken: string; refreshToken: string }> {
        const user = await this.usersService.findByConfirmationToken(token)
        if (user === undefined) {
            throw new NotFoundException()
        }
        await this.userRepository.save({ ...user, enabled: true, confirmationToken: null })
        return this.authService.getUserTokens(user)
    }

    @UseGuards(JwtAuthGuard)
    @Get('logout')
    async logout(@Req() request: Request): Promise<void> {
        await this.authService.logout(request.user as User)
    }
}
