import { Injectable } from '@nestjs/common';
import { User } from './user.entity';
import { CreateUserDto } from './create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    async create(createUserDto: CreateUserDto) {
        const user = User.create(createUserDto);
        await user.save().catch((err) => {
            console.log(err)
        });

        delete user.password;
        return user;
    }

    async showById(id: number): Promise<User> {
        const user = await this.findById(id);

        delete user.password;
        return user;
    }

    async findById(id: number) {
        return await User.findOne(id);
    }

    async findByUsername(username: string) {
        return await User.findOne({
            where: {
                username: username,
            },
        });
    }

    async setCurrentRefreshToken(refreshToken: string, userId: number) {
        const currentHashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        await User.update(userId, {
            currentHashedRefreshToken
        });
    }
}
