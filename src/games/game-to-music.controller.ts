import { createReadStream } from 'fs'

import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    Patch,
    Post,
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
import { AddDerivedGameToMusicDto } from './dto/add-derived-game-to-music.dto'
import { GameToMusicEditDto } from './dto/game-to-music-edit.dto'
import { GameToMusic, GameToMusicType } from './entity/game-to-music.entity'
import { Game } from './entity/game.entity'
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
        @InjectRepository(Game)
        private gameRepository: Repository<Game>,
    ) {}

    @Delete('/:id')
    async delete(@Param('id') id: number): Promise<void> {
        const gameToMusic = await this.gameToMusicRepository.findOneBy({
            id,
        })
        if (!gameToMusic) {
            throw new NotFoundException()
        }
        await this.gameToMusicRepository.remove(gameToMusic)
    }

    @Get('/:id/listen')
    async listen(
        @Param('id') id: number,
        @Req() request: Request,
        @Response({ passthrough: true }) res: ExpressReponse,
    ): Promise<StreamableFile> {
        const gameToMusic = await this.gameToMusicRepository.findOneBy({
            id,
        })
        if (!gameToMusic) {
            throw new NotFoundException()
        }
        const file = createReadStream(gameToMusic.music.file.path)
        res.set({
            'Content-Type': 'audio/mpeg',
        })
        return new StreamableFile(file)
    }

    @Roles(Role.Admin)
    @Patch('/:id')
    async edit(
        @Param('id') id: number,
        @Body() musicEditDto: GameToMusicEditDto,
    ): Promise<GameToMusic> {
        const gameToMusic = await this.gameToMusicRepository.findOneBy({
            id: id,
        })
        if (!gameToMusic) {
            throw new NotFoundException()
        }
        return this.gameToMusicRepository.save({
            ...gameToMusic,
            title: musicEditDto.title,
            artist: musicEditDto.artist,
        })
    }

    @Post('/:id/add-derived')
    async addDerived(
        @Param('id') id: number,
        @Body() derivedGameToMusicDto: AddDerivedGameToMusicDto,
    ): Promise<GameToMusic | null> {
        const gameToMusic = await this.gameToMusicRepository.findOne({
            where: {
                id,
                type: GameToMusicType.Original,
            },
        })
        if (!gameToMusic) {
            throw new NotFoundException()
        }
        const game = await this.gameRepository.findOneBy({
            id: derivedGameToMusicDto.gameId,
        })
        if (!game) {
            throw new BadRequestException()
        }
        await this.gameToMusicRepository.save({
            ...gameToMusic,
            id: undefined,
            originalGameToMusic: gameToMusic,
            game,
            type: GameToMusicType.Reused,
            playNumber: 0,
            guessAccuracy: null,
        })

        return this.gameToMusicRepository.findOne({
            relations: ['derivedGameToMusics', 'derivedGameToMusics.game'],
            where: {
                id,
            },
        })
    }
}
