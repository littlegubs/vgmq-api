import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AuthRegisterDto } from '../auth/dto/auth-register.dto'
import { User } from './user.entity'

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) {}

    async create(createUserDto: AuthRegisterDto): Promise<User> {
        const user = this.usersRepository.create(createUserDto)
        await this.usersRepository.save(user)

        const { password, ...userWhithoutPassword } = user

        return userWhithoutPassword as User
    }

    async findByUsername(username: string): Promise<User | undefined> {
        return this.usersRepository.findOne({
            where: {
                username: username,
            },
        })
    }
}
