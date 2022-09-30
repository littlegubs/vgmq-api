import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import * as Joi from 'joi'
import { DataSource } from 'typeorm'

import { AlternativeNamesModule } from './alternative-names/alternative-names.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { GamesModule } from './games/games.module'
import { LimitedAccessModule } from './limited-access/limited-access.module'
import { LobbyModule } from './lobbies/lobby.module'
import { MailModule } from './mail/mail.module'
import { MusicsModule } from './musics/musics.module'
import { S3Service } from './s3/s3.service'
import { FileSubscriber } from './subscribers/file.subscriber'
import { UsersModule } from './users/users.module'

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validationSchema: Joi.object({
                ENV: Joi.string().valid('dev', 'prod').default('dev'),
            }),
            envFilePath: ['.env.local', '.env'],
        }),
        TypeOrmModule.forRoot({
            type: 'mysql',
            host: process.env.DATABASE_HOST,
            port: process.env.DATABASE_PORT ? parseInt(process.env.DATABASE_PORT) : 3306,
            username: process.env.DATABASE_USERNAME,
            password: process.env.DATABASE_PASSWORD,
            database: process.env.DATABASE_NAME,
            autoLoadEntities: true,
        }),
        BullModule.forRootAsync({
            useFactory: (configService: ConfigService) => ({
                redis: {
                    host: configService.get('REDIS_HOST'),
                    port: configService.get<number>('REDIS_PORT'),
                },
            }),
            inject: [ConfigService],
        }),
        UsersModule,
        AuthModule,
        LimitedAccessModule,
        GamesModule,
        AlternativeNamesModule,
        MusicsModule,
        LobbyModule,
        MailModule,
    ],
    controllers: [AppController],
    providers: [AppService, FileSubscriber, S3Service],
})
export class AppModule {
    constructor(private dataSource: DataSource) {}
}
