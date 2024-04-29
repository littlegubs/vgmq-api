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
    async getStats(): Promise<{ stats: { count: number; date: string }[]; count: number }> {
        const users: { count: string; date: string }[] = await this.userRepository
            .createQueryBuilder('u')
            .select('count(*) as count, DATE(u.createdAt) as date')
            .andWhere('u.enabled = 1')
            .groupBy('date')
            .getRawMany()

        return {
            count: await this.userRepository.countBy({ enabled: true }),
            stats: users.reduce(
                (previousValue: { count: number; date: string }[], currentValue, currentIndex) => {
                    return [
                        ...previousValue,
                        {
                            count:
                                (previousValue[currentIndex - 1]?.count ?? 0) +
                                parseInt(currentValue.count),
                            date: currentValue.date,
                        },
                    ]
                },
                [],
            ),
        }
    }
}
