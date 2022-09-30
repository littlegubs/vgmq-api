import { BullModule } from '@nestjs/bull'
import { CacheModule, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { GameToMusic } from '../games/entity/game-to-music.entity'
import { Game } from '../games/entity/game.entity'
import { MusicAccuracy } from '../games/entity/music-accuracy.entity'
import { Music } from '../games/entity/music.entity'
import { S3Service } from '../s3/s3.service'
import { User } from '../users/user.entity'
import { LobbyMusic } from './entities/lobby-music.entity'
import { LobbyUser } from './entities/lobby-user.entity'
import { Lobby } from './entities/lobby.entity'
import { LobbyFileGateway } from './lobby-file.gateway'
import { LobbyListGateway } from './lobby-list.gateway'
import { LobbyController } from './lobby.controller'
import { LobbyGateway } from './lobby.gateway'
import { LobbyProcessor } from './lobby.processor'
import { LobbyUserService } from './services/lobby-user.service'
import { LobbyService } from './services/lobby.service'
import { LobbyUserSubscriber } from './subscribers/lobby-user.subscriber'
import { LobbySubscriber } from './subscribers/lobby.subscriber'

@Module({
    controllers: [LobbyController],
    imports: [
        TypeOrmModule.forFeature([
            Lobby,
            LobbyMusic,
            LobbyUser,
            Game,
            GameToMusic,
            Music,
            User,
            MusicAccuracy,
        ]),
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
        S3Service,
        LobbyFileGateway,
        LobbyUserService,
    ],
})
export class LobbyModule {}
