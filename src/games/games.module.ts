import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AlternativeName } from './entity/alternative-name.entity'
import { Cover } from './entity/cover.entity'
import { Game } from './entity/game.entity'
import { IgdbClient } from './entity/igdb.entity'
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
