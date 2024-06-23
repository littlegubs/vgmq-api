import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    HttpCode,
    NotFoundException,
    Param,
    Put,
    Req,
    UseGuards,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Request } from 'express'
import { Repository } from 'typeorm'

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Role, RoleAction, RoleRules } from '../users/role.enum'
import { Roles } from '../users/roles.decorator'
import { RolesGuard } from '../users/roles.guard'
import { User } from '../users/user.entity'
import { AdminBanDto } from './dto/admin-ban.dto'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/users')
export class UsersController {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) {}

    @Roles(Role.Admin, Role.SuperAdmin)
    @Get('')
    async getAllUsers(): Promise<User[]> {
        return this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.bannedBy', 'bannedBy')
            .select([
                'bannedBy.username',
                'user.id',
                'user.username',
                'user.email',
                'user.enabled',
                'user.banReason',
                'user.createdAt',
            ])
            .getMany()
    }

    @Roles(Role.Admin, Role.SuperAdmin)
    @Put('/ban/:id')
    @HttpCode(204)
    async banUser(
        @Req() request: Request,
        @Param('id') id: number,
        @Body() adminBanDto: AdminBanDto,
    ): Promise<void> {
        const bannedUser = await this.userRepository.findOneBy({ id: id })

        if (!bannedUser) {
            throw new NotFoundException()
        }

        const user = request.user as User
        const canBan = RoleRules[user.roles.at(-1) as Role][RoleAction.Ban].includes(
            bannedUser.roles.at(-1) as Role,
        )

        if (!canBan) {
            throw new ForbiddenException()
        }

        await this.userRepository.save({
            ...bannedUser,
            enabled: false,
            banReason: adminBanDto.banReason,
            bannedBy: request.user as User,
        })
    }
}
