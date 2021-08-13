import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AlternativeName } from './entities/alternative-name.entity'
import { Cover } from './entities/cover.entity'
import { Game } from './entities/game.entity'
import { GamesService } from './services/games.service'

@Module({
    imports: [TypeOrmModule.forFeature([Game, AlternativeName, Cover])],
  providers: [GamesService],
})
export class GamesModule {}
