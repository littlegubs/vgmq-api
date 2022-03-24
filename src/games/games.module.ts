import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { File } from '../entity/file.entity'
import { User } from '../users/user.entity'
import { AdminGamesController } from './admin-games.controller'
import { AlternativeName } from './entity/alternative-name.entity'
import { Cover } from './entity/cover.entity'
import { GameToMusic } from './entity/game-to-music.entity'
import { Game } from './entity/game.entity'
import { IgdbClient } from './entity/igdb.entity'
import { Music } from './entity/music.entity'
import { GameToMusicController } from './game-to-music.controller'
import { GamesController } from './games.controller'
import { IgdbHttpService } from './http/igdb.http.service'
import { GameSseService } from './services/game-sse.service'
import { GamesService } from './services/games.service'
import { IgdbService } from './services/igdb.service'
import { GameToMusicSubscriber } from './subscribers/game-to-music.subscriber'

@Module({
    controllers: [AdminGamesController, GamesController, GameToMusicController],
    imports: [
        TypeOrmModule.forFeature([
            Game,
            AlternativeName,
            Cover,
            IgdbClient,
            GameToMusic,
            Music,
            File,
            User,
        ]),
        HttpModule,
    ],
    providers: [GamesService, IgdbService, IgdbHttpService, GameToMusicSubscriber, GameSseService],
})
export class GamesModule {}
