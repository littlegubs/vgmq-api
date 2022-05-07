import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { UserSubscriber } from './subscribers/user.subscriber'
import { User } from './user.entity'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
    controllers: [UsersController],
    imports: [TypeOrmModule.forFeature([User])],
    providers: [UsersService, UserSubscriber],
    exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
