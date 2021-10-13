import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { File } from '../entity/file.entity'
import { AlternativeName } from './entity/alternative-name.entity'
import { Cover } from './entity/cover.entity'
import { GameToMusic } from './entity/game-to-music.entity'
import { Game } from './entity/game.entity'
import { IgdbClient } from './entity/igdb.entity'
import { Music } from './entity/music.entity'
import { GameToMusicController } from './game-to-music.controller'
import { GamesController } from './games.controller'
import { IgdbHttpService } from './http/igdb.http.service'
import { GamesService } from './services/games.service'
import { IgdbService } from './services/igdb.service'
import { GameToMusicSubscriber } from './subscribers/game-to-music.subscriber'

@Module({
    controllers: [GamesController, GameToMusicController],
    imports: [
        TypeOrmModule.forFeature([
            Game,
            AlternativeName,
            Cover,
            IgdbClient,
            GameToMusic,
            Music,
            File,
        ]),
        HttpModule,
    ],
    providers: [GamesService, IgdbService, IgdbHttpService, GameToMusicSubscriber],
})
export class GamesModule {}
