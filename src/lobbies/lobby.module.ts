import { BullModule } from '@nestjs/bull'
import { CacheModule, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { GameToMusic } from '../games/entity/game-to-music.entity'
import { Game } from '../games/entity/game.entity'
import { Music } from '../games/entity/music.entity'
import { LobbyMusic } from './entities/lobby-music.entity'
import { LobbyUser } from './entities/lobby-user.entity'
import { Lobby } from './entities/lobby.entity'
import { LobbyController } from './lobby.controller'
import { LobbyGateway } from './lobby.gateway'
import { LobbyProcessor } from './lobby.processor'
import { LobbyService } from './lobby.service'
import { LobbyUserSubscriber } from './subscribers/lobby-user.subscriber'

@Module({
    controllers: [LobbyController],
    imports: [
        TypeOrmModule.forFeature([Lobby, LobbyMusic, LobbyUser, Game, GameToMusic, Music]),
        CacheModule.register(),
        BullModule.registerQueue({
            name: 'lobby',
        }),
    ],
    providers: [LobbyService, LobbyGateway, LobbyProcessor, LobbyUserSubscriber],
})
export class LobbyModule {}
