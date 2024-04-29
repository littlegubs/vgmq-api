import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { File } from '../entity/file.entity'
import { User } from '../users/user.entity'
import { UsersController } from './users.controller'

@Module({
    controllers: [UsersController],
    imports: [TypeOrmModule.forFeature([File, User])],
})
export class AdminModule {}
