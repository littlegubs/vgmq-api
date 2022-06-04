import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ElasticsearchModule } from '@nestjs/elasticsearch'
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
import { GamesService } from './services/games.service'
import { IgdbService } from './services/igdb.service'
import { AlternativeNameSubscriber } from './subscribers/alternative-name.subscriber'
import { GameToMusicSubscriber } from './subscribers/game-to-music.subscriber'
import { GameSubscriber } from './subscribers/game.subscriber'

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
        ElasticsearchModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                node: configService.get('ELASTICSEARCH_NODE'),
                auth: {
                    username: configService.get('ELASTICSEARCH_USERNAME')!,
                    password: configService.get('ELASTICSEARCH_PASSWORD')!,
                },
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [
        GamesService,
        IgdbService,
        IgdbHttpService,
        GameToMusicSubscriber,
        GameSubscriber,
        AlternativeNameSubscriber,
    ],
})
export class GamesModule {}
