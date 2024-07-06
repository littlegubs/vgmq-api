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
import { Role } from '../users/role.enum'
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
        const user = request.user as User
        const userToBan = await this.userRepository.findOneBy({ id: id })
        let canBan = false
        if (!userToBan) {
            throw new NotFoundException()
        }

        if (user.roles.includes(Role.SuperAdmin)) {
            canBan = !userToBan.roles.includes(Role.SuperAdmin)
        } else if (user.roles.includes(Role.Admin)) {
            canBan = !(
                userToBan.roles.includes(Role.Admin) || userToBan.roles.includes(Role.SuperAdmin)
            )
        }

        if (!canBan) {
            throw new ForbiddenException()
        }

        await this.userRepository.save({
            ...userToBan,
            enabled: false,
            banReason: adminBanDto.banReason,
            bannedBy: user,
            currentHashedRefreshToken: null,
            confirmationToken: null,
            resetPasswordToken: null,
        })
    }
}
