import { Controller, Get, UseGuards } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Role } from '../users/role.enum'
import { Roles } from '../users/roles.decorator'
import { RolesGuard } from '../users/roles.guard'
import { User } from '../users/user.entity'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/users')
export class UsersController {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) {}

    @Roles(Role.Admin)
    @Get('')
    async getStats(): Promise<User[]> {
        return this.userRepository.find({
            where: { enabled: true },
            select: { createdAt: true },
        })
    }
}
