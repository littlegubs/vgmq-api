import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AuthRegisterDto } from '../auth/dto/auth-register.dto'
import { User } from './user.entity'

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) {}

    async create(createUserDto: AuthRegisterDto): Promise<User> {
        const user = this.userRepository.create(createUserDto)
        await this.userRepository.save(user)

        const { password, ...userWhithoutPassword } = user

        return userWhithoutPassword as User
    }

    async findByUsername(username: string): Promise<User | undefined> {
        return this.userRepository.findOne({
            where: {
                username: username,
            },
        })
    }
}
