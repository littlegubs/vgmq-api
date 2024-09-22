import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { File } from '../entity/file.entity'
import { LobbyMusic } from '../lobbies/entities/lobby-music.entity'
import { LobbyUser } from '../lobbies/entities/lobby-user.entity'
import { Lobby } from '../lobbies/entities/lobby.entity'
import { User } from '../users/user.entity'
import { SystemController } from './system.controller'
import { UsersController } from './users.controller'

@Module({
    controllers: [UsersController, SystemController],
    imports: [
        TypeOrmModule.forFeature([File, User, Lobby, LobbyMusic, LobbyUser]),
        BullModule.registerQueue({
            name: 'lobby',
        }),
    ],
})
export class AdminModule {}
