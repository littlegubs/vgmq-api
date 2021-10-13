import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import * as Joi from 'joi'

import { AlternativeNamesModule } from './alternative-names/alternative-names.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { GamesModule } from './games/games.module'
import { LimitedAccessModule } from './limited-access/limited-access.module'
import { MusicsModule } from './musics/musics.module'
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
            logging: true,
            database: process.env.DATABASE_NAME,
            synchronize: true, // dev only
            autoLoadEntities: true,
        }),
        UsersModule,
        AuthModule,
        LimitedAccessModule,
        GamesModule,
        AlternativeNamesModule,
        MusicsModule,
    ],
    controllers: [AppController],
    providers: [AppService, FileSubscriber],
})
export class AppModule {}
