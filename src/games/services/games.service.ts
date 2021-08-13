import { Injectable } from '@nestjs/common';
import { Game } from '../entities/game.entity';

@Injectable()
export class GamesService {
  async findByName(name: string) {
    return await Game.findOne({
      where: {
        name: name,
        alternativeNames: {
          name: name,
        },
      },
    });
  }

async fetchIgdbGamesByName(name: string) {

}
}
