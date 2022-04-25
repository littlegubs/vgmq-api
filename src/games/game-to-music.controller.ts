import { createReadStream } from 'fs'

import {
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    Req,
    Response,
    StreamableFile,
    UseGuards,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Request, Response as ExpressReponse } from 'express'
import { Repository } from 'typeorm'

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Role } from '../users/role.enum'
import { Roles } from '../users/roles.decorator'
import { RolesGuard } from '../users/roles.guard'
import { GameToMusic } from './entity/game-to-music.entity'
import { GamesService } from './services/games.service'
import { IgdbService } from './services/igdb.service'

@Controller('admin/game-to-music')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
export class GameToMusicController {
    constructor(
        private gamesService: GamesService,
        private igdbService: IgdbService,
        @InjectRepository(GameToMusic)
        private gameToMusicRepository: Repository<GameToMusic>,
    ) {}

    @Delete('/:id')
    async delete(@Param('id') id: string): Promise<void> {
        const gameToMusic = await this.gameToMusicRepository.findOne(id)
        if (!gameToMusic) {
            throw new NotFoundException()
        }
        await this.gameToMusicRepository.remove(gameToMusic)
    }

    @Get('/:id/listen')
    async listen(
        @Param('id') id: string,
        @Req() request: Request,
        @Response({ passthrough: true }) res: ExpressReponse,
    ): Promise<StreamableFile> {
        const gameToMusic = await this.gameToMusicRepository.findOne(id)
        if (!gameToMusic) {
            throw new NotFoundException()
        }
        const file = createReadStream(gameToMusic.music.file.path)
        res.set({
            'Content-Type': 'audio/mpeg',
        })
        return new StreamableFile(file)
    }
}
