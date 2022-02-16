import { BullModule } from '@nestjs/bull'
import { CacheModule, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { GameToMusic } from '../games/entity/game-to-music.entity'
import { Game } from '../games/entity/game.entity'
import { Music } from '../games/entity/music.entity'
import { LobbyMusic } from './entities/lobby-music.entity'
import { Lobby } from './entities/lobby.entity'
import { LobbyGateway } from './events/lobby.gateway'
import { LobbyMusicController } from './lobby-music.controller'
import { LobbyController } from './lobby.controller'
import { LobbyProcessor } from './lobby.processor'
import { LobbyService } from './lobby.service'

@Module({
    controllers: [LobbyController, LobbyMusicController],
    imports: [
        TypeOrmModule.forFeature([Lobby, LobbyMusic, Game, GameToMusic, Music]),
        CacheModule.register(),
        BullModule.registerQueue({
            name: 'lobby',
        }),
    ],
    providers: [LobbyService, LobbyGateway, LobbyProcessor],
})
export class LobbyModule {}
