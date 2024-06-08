import {
    Body,
    Controller,
    Get,
    HttpCode,
    NotFoundException,
    Param,
    Put,
    UseGuards,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
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

    @Roles(Role.Admin)
    @Get('')
    async getAllUsers(): Promise<User[]> {
        return this.userRepository.find({
            select: {
                createdAt: true,
                id: true,
                username: true,
                email: true,
                enabled: true,
                banReason: true,
            },
        })
    }

    @Roles(Role.Admin)
    @Put('/ban/:id')
    @HttpCode(204)
    async banUser(@Param('id') id: number, @Body() adminBanDto: AdminBanDto): Promise<void> {
        const user = await this.userRepository.findOneBy({ id: id })

        if (!user) {
            throw new NotFoundException()
        }

        await this.userRepository.save({
            ...user,
            enabled: false,
            banReason: adminBanDto.banReason,
        })
    }
}
