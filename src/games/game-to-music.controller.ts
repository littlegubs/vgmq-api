import { Readable } from 'stream'

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
import { S3Service } from '../s3/s3.service'
import { Role } from '../users/role.enum'
import { Roles } from '../users/roles.decorator'
import { RolesGuard } from '../users/roles.guard'
import { User } from '../users/user.entity'
import { AddDerivedGameToMusicDto } from './dto/add-derived-game-to-music.dto'
import { GameToMusicEditDto } from './dto/game-to-music-edit.dto'
import { GameAlbum } from './entity/game-album.entity'
import { GameToMusic, GameToMusicType } from './entity/game-to-music.entity'
import { Game } from './entity/game.entity'

@Controller('admin/game-to-music')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin, Role.SuperAdmin)
export class GameToMusicController {
    constructor(
        @InjectRepository(GameToMusic) private gameToMusicRepository: Repository<GameToMusic>,
        @InjectRepository(Game) private gameRepository: Repository<Game>,
        @InjectRepository(GameAlbum) private gameAlbumRepository: Repository<GameAlbum>,
        private s3Service: S3Service,
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
        const file = await this.s3Service.getObject(gameToMusic.music.file.path)
        const buffer = await this.s3Service.streamToBuffer(file.Body as Readable)
        res.set({
            'Content-Type': 'audio/mpeg',
        })
        return new StreamableFile(buffer)
    }

    @Roles(Role.Admin, Role.SuperAdmin)
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
            disk: musicEditDto.disk,
            track: musicEditDto.track,
            album: musicEditDto.album,
        })
    }

    @Post('/:id/add-derived')
    async addDerived(
        @Req() request: Request,
        @Param('id') id: number,
        @Body() derivedGameToMusicDto: AddDerivedGameToMusicDto,
    ): Promise<GameToMusic | null> {
        const user = request.user as User
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
            addedBy: user,
        })

        return this.gameToMusicRepository.findOne({
            relations: ['derivedGameToMusics', 'derivedGameToMusics.game'],
            where: {
                id,
            },
        })
    }
}
