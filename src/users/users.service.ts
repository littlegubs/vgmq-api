import { Injectable } from '@nestjs/common';
import { User } from './user.entity';
import { AuthRegisterDto } from '../auth/dto/auth-register.dto';

@Injectable()
export class UsersService {
  async create(createUserDto: AuthRegisterDto) {
    const user = User.create(createUserDto);
    await user.save();

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
}
