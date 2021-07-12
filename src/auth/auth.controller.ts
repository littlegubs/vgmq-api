import {Body, Controller, Get, Post, Req, UseGuards} from '@nestjs/common';
import {UsersService} from "../users/users.service";
import {CreateUserDto} from "../users/create-user.dto";
import {AuthService} from "./auth.service";
import {AuthLoginDto} from "./auth-login.dto";
import {JwtAuthGuard} from "./jwt-auth.guard";
import {JwtRefreshGuard} from "./jwt-refresh.guard";
import {Request} from "express";


@Controller('auth')
export class AuthController {
    constructor(private readonly usersService: UsersService, private authService: AuthService) {}

    @Post('register')
    register(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Post('login')
    async login(@Body() authLoginDto: AuthLoginDto) {
        return this.authService.login(authLoginDto);
    }

    @UseGuards(JwtRefreshGuard)
    @Post('refresh')
    refresh(@Req() request) {
        console.log(request.user)
        return {
            access_token: this.authService.getJwtAccessToken({userId: request.user.id})
        };
    }

    @UseGuards(JwtAuthGuard)
    @Get('yoyo')
    async test() {
        return 'Success!';
    }
}
