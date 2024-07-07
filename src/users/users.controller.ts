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
import { InjectRepository } from '@nestjs/typeorm'
import { Request } from 'express'
import { Repository } from 'typeorm'

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UsersUpdatePasswordDto } from './dto/users-update-password.dto'
import { User } from './user.entity'

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) {}

    @Get('current')
    getCurrent(@Req() request: Request): { createdAt: Date; email: string; username: string } {
        const { createdAt, email, username } = request.user as User

        return {
            createdAt,
            email,
            username,
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
            (await this.userRepository.save({
                ...user,
                enabled: false,
                username: `deletedAccount${user.id}`,
                email: `deletedAccount${user.id}@videogamemusicquiz.com`,
                password: 'yoyo',
                currentHashedRefreshToken: null,
            }))
    }
}
