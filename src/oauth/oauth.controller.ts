import {
    Controller,
    Get,
    NotFoundException,
    Query,
    Redirect,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Request } from 'express'
import { Repository } from 'typeorm'

import { AuthService } from '../auth/auth.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { User } from '../users/user.entity'
import { OauthPatreon } from './entities/oauth-patreon.entity'
import { GoogleOauthGuard } from './guards/google-auth.guard'
import { PatreonService } from './services/patreon.service'

@Controller('oauth')
export class OauthController {
    constructor(
        private patreonService: PatreonService,
        private authService: AuthService,
        private configService: ConfigService,
        @InjectRepository(OauthPatreon) private oauthPatreonRepository: Repository<OauthPatreon>,
    ) {}

    @Get('patreon')
    @UseGuards(JwtAuthGuard)
    async patreon(
        @Req() request: Request,
        @Query('code') code: string,
    ): Promise<{ userFullName: string }> {
        const user = request.user as User
        const userFullName = await this.patreonService.linkUserToPatreon(code, user)
        return { userFullName }
    }

    @Get('patreon/refresh')
    @UseGuards(JwtAuthGuard)
    async refreshPatreonData(@Req() request: Request): Promise<void> {
        const user = request.user as User
        const oauthPatreon = await this.oauthPatreonRepository.findOne({
            relations: { user: true },
            where: { user: { id: user.id } },
        })
        if (oauthPatreon === null) {
            throw new NotFoundException()
        }
        await this.patreonService.refreshData(oauthPatreon)
    }

    @Get('patreon/unlink')
    @UseGuards(JwtAuthGuard)
    async unlinkPatreon(@Req() request: Request): Promise<void> {
        const user = request.user as User
        await this.patreonService.unlinkUserToPatreon(user)
    }

    @Get('google')
    @UseGuards(GoogleOauthGuard)
    googleAuth(): void {
        // Need to be empty redirect automatically to google
    }

    @Get('google/callback')
    @UseGuards(GoogleOauthGuard)
    @Redirect('https://front-end-host/auth-callback', 301)
    googleAuthRedirect(@Req() req: Request): { url: string } {
        const user = req.user as User

        return {
            url: `${this.configService.get(
                'VGMQ_CLIENT_URL',
            )}/oauth/google?accessToken=${this.authService.getJwtAccessToken(
                user,
            )}&refreshToken=${this.authService.getJwtAccessToken(user)}`,
        }
    }
}
