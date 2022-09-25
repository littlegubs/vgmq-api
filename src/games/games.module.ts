import { HttpModule } from '@nestjs/axios'
import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ElasticsearchModule } from '@nestjs/elasticsearch'
import { TypeOrmModule } from '@nestjs/typeorm'

import { File } from '../entity/file.entity'
import { User } from '../users/user.entity'
import { AdminGamesController } from './admin-games.controller'
import { AlternativeName } from './entity/alternative-name.entity'
import { ColorPalette } from './entity/color-palette.entity'
import { Cover } from './entity/cover.entity'
import { GameToMusic } from './entity/game-to-music.entity'
import { Game } from './entity/game.entity'
import { IgdbClient } from './entity/igdb.entity'
import { MusicAccuracy } from './entity/music-accuracy.entity'
import { Music } from './entity/music.entity'
import { Platform } from './entity/platform.entity'
import { GameToMusicController } from './game-to-music.controller'
import { WebhookController } from './games-webhook.controller'
import { GamesController } from './games.controller'
import { IgdbHttpService } from './http/igdb.http.service'
import { GamesService } from './services/games.service'
import { IgdbService } from './services/igdb.service'
import { AlternativeNameSubscriber } from './subscribers/alternative-name.subscriber'
import { GameToMusicSubscriber } from './subscribers/game-to-music.subscriber'
import { GameSubscriber } from './subscribers/game.subscriber'
import { MusicAccuracySubscriber } from './subscribers/music-accuracy.subscriber'

@Module({
    controllers: [AdminGamesController, GamesController, GameToMusicController, WebhookController],
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
            ColorPalette,
            MusicAccuracy,
            Platform,
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
                ...(configService.get('ELASTICSEARCH_CA_PATH') && {
                    tls: {
                        ca: configService.get('ELASTICSEARCH_CA_PATH'),
                        rejectUnauthorized: false,
                    },
                }),
                requestTimeout: 300000,
            }),
            inject: [ConfigService],
        }),
        BullModule.registerQueue({
            name: 'igdbWebhook',
        }),
    ],
    providers: [
        GamesService,
        IgdbService,
        IgdbHttpService,
        GameToMusicSubscriber,
        GameSubscriber,
        AlternativeNameSubscriber,
        MusicAccuracySubscriber,
    ],
})
export class GamesModule {}
