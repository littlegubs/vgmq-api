import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AlternativeName } from './entities/alternative-name.entity'
import { Cover } from './entities/cover.entity'
import { Game } from './entities/game.entity'
import { IgdbClient } from './entities/igdb.entity'
import { GamesController } from './games.controller'
import { IgdbHttpService } from './http/igdb.http.service'
import { GamesService } from './services/games.service'
import { IgdbService } from './services/igdb.service'

@Module({
    controllers: [GamesController],
    imports: [TypeOrmModule.forFeature([Game, AlternativeName, Cover, IgdbClient]), HttpModule],
    providers: [GamesService, IgdbService, IgdbHttpService],
})
export class GamesModule {}
