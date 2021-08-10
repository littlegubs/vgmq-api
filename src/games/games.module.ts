import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from './entities/game.entity';
import { AlternativeName } from './entities/alternative-name.entity';
import { Cover } from './entities/cover.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Game, AlternativeName, Cover])],
})
export class GamesModule {}
