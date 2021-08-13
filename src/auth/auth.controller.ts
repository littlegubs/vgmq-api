import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { AuthLoginDto } from './dto/auth-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { AuthRegisterDto } from './dto/auth-register.dto';
import { LimitedAccessGuard } from '../limited-access/guards/limited-access.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly usersService: UsersService,
    private authService: AuthService,
  ) {}

  @Post('register')
  @UseGuards(LimitedAccessGuard)
  async register(@Body() createUserDto: AuthRegisterDto) {
    const user = await this.usersService.create(createUserDto);
    return this.authService.getUserTokens(user);
  }

  @Post('login')
  async login(@Body() authLoginDto: AuthLoginDto) {
    return this.authService.login(authLoginDto);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  refresh(@Req() request) {
    return {
      access_token: this.authService.getJwtAccessToken({
        userId: request.user.id,
      }),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('logout')
  async logout(@Req() request) {
    await this.authService.logout(request.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('yoyo')
  async test() {
    return 'Success!';
  }
}
