import { Injectable } from '@nestjs/common'

import { AuthRegisterDto } from '../auth/dto/auth-register.dto'
import { User } from './user.entity'

@Injectable()
export class UsersService {
    async create(createUserDto: AuthRegisterDto): Promise<User> {
        const user = User.create(createUserDto)
        await user.save()

        const { password, ...userWhithoutPassword } = user

        return userWhithoutPassword as User
    }

    async showById(id: number): Promise<User | undefined> {
        const user = await this.findById(id)

        if (!user) return undefined

        const { password, ...userWhithoutPassword } = user

        return userWhithoutPassword as User
    }

    async findById(id: number): Promise<User | undefined> {
        return User.findOne(id)
    }

    async findByUsername(username: string): Promise<User | undefined> {
        return User.findOne({
            where: {
                username: username,
            },
        })
    }
}
