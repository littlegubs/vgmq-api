import {
    Body,
    Controller,
    Get,
    Post,
    Req,
    ForbiddenException,
    UseGuards,
    HttpCode,
    Delete,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { classToClass } from 'class-transformer'
import { Request } from 'express'
import { Repository } from 'typeorm'

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { OauthPatreon } from '../oauth/entities/oauth-patreon.entity'
import { PatreonService } from '../oauth/services/patreon.service'
import { UsersUpdatePasswordDto } from './dto/users-update-password.dto'
import { User } from './user.entity'

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(
        private configService: ConfigService,
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(OauthPatreon) private oauthPatreonRepository: Repository<OauthPatreon>,
        private patreonService: PatreonService,
    ) {}

    @Get('current')
    async getCurrent(@Req() request: Request): Promise<{
        createdAt: Date
        email: string
        username: string
        patreonAccount: OauthPatreon | null
        entitledTiers: string[]
    }> {
        const { id, createdAt, email, username } = request.user as User
        let oauthPatreon = await this.oauthPatreonRepository.findOne({
            relations: { user: true },
            where: {
                user: { id },
            },
        })

        const entitledTiers: string[] = []
        if (oauthPatreon !== null) {
            oauthPatreon = await this.patreonService.shouldRefreshData(oauthPatreon)
            for (const tier of oauthPatreon.currentlyEntitledTiers) {
                if (this.configService.get('PATREON_TIER_1_ID') === tier) {
                    entitledTiers.push('Gaming!')
                } else if (this.configService.get('PATREON_TIER_2_ID') === tier) {
                    entitledTiers.push('Gamer!')
                }
            }
        }

        return {
            createdAt,
            email,
            username,
            patreonAccount: classToClass(oauthPatreon, {
                groups: ['userProfile'],
                strategy: 'excludeAll',
            }),
            entitledTiers,
        }
    }

    @Post('password/update')
    @HttpCode(200)
    async updatePassword(
        @Body() usersUpdatePassword: UsersUpdatePasswordDto,
        @Req() request: Request,
    ): Promise<void> {
        const user = request.user as User

        if (!(await user.validatePassword(usersUpdatePassword.password))) {
            throw new ForbiddenException('Wrong password')
        }

        await this.userRepository.save(
            this.userRepository.create({
                ...user,
                password: usersUpdatePassword.newPassword,
            }),
        )
    }

    @Delete('')
    async delete(@Req() request: Request): Promise<void> {
        const user = request.user as User
        user &&
            (await this.userRepository.save(
                this.userRepository.create({
                    ...user,
                    enabled: false,
                    username: `deletedAccount${user.id}`,
                    email: `deletedAccount${user.id}@videogamemusicquiz.com`,
                    password: 'yoyo',
                    currentHashedRefreshToken: null,
                }),
            ))
    }
}
