import { Controller, Delete, NotFoundException, Param, UseGuards } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Role } from '../users/role.enum'
import { Roles } from '../users/roles.decorator'
import { RolesGuard } from '../users/roles.guard'
import { GameToMusic } from './entity/game-to-music.entity'
import { GamesService } from './services/games.service'
import { IgdbService } from './services/igdb.service'

@Controller('game-to-music')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GameToMusicController {
    constructor(
        private gamesService: GamesService,
        private igdbService: IgdbService,
        @InjectRepository(GameToMusic)
        private gameToMusicRepository: Repository<GameToMusic>,
    ) {}

    @Roles(Role.Admin)
    @Delete('/:id')
    async delete(@Param('id') id: string): Promise<void> {
        const gameToMusic = await this.gameToMusicRepository.findOne(id)
        if (!gameToMusic) {
            throw new NotFoundException()
        }
        await this.gameToMusicRepository.remove(gameToMusic)
    }
}
