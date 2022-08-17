import { BullModule } from '@nestjs/bull'
import { CacheModule, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { GameToMusic } from '../games/entity/game-to-music.entity'
import { Game } from '../games/entity/game.entity'
import { Music } from '../games/entity/music.entity'
import { User } from '../users/user.entity'
import { LobbyMusic } from './entities/lobby-music.entity'
import { LobbyUser } from './entities/lobby-user.entity'
import { Lobby } from './entities/lobby.entity'
import { LobbyListGateway } from './lobby-list.gateway'
import { LobbyController } from './lobby.controller'
import { LobbyGateway } from './lobby.gateway'
import { LobbyProcessor } from './lobby.processor'
import { LobbyService } from './lobby.service'
import { LobbyUserSubscriber } from './subscribers/lobby-user.subscriber'
import { LobbySubscriber } from './subscribers/lobby.subscriber'

@Module({
    controllers: [LobbyController],
    imports: [
        TypeOrmModule.forFeature([Lobby, LobbyMusic, LobbyUser, Game, GameToMusic, Music, User]),
        CacheModule.register(),
        BullModule.registerQueue({
            name: 'lobby',
        }),
    ],
    providers: [
        LobbyService,
        LobbyGateway,
        LobbyListGateway,
        LobbyProcessor,
        LobbySubscriber,
        LobbyUserSubscriber,
    ],
})
export class LobbyModule {}
