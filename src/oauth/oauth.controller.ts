import { Controller, Get, NotFoundException, Query, Req, UseGuards } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Request } from 'express'
import { Repository } from 'typeorm'

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { User } from '../users/user.entity'
import { OauthPatreon } from './entities/oauth-patreon.entity'
import { PatreonService } from './services/patreon.service'

@Controller('oauth')
@UseGuards(JwtAuthGuard)
export class OauthController {
    constructor(
        private patreonService: PatreonService,
        @InjectRepository(OauthPatreon) private oauthPatreonRepository: Repository<OauthPatreon>,
    ) {}

    @Get('patreon')
    async patreon(
        @Req() request: Request,
        @Query('code') code: string,
    ): Promise<{ userFullName: string }> {
        const user = request.user as User
        const userFullName = await this.patreonService.linkUserToPatreon(code, user)
        return { userFullName }
    }

    @Get('patreon/refresh')
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
    async unlinkPatreon(@Req() request: Request): Promise<void> {
        const user = request.user as User
        await this.patreonService.unlinkUserToPatreon(user)
    }
}
