import { extname } from 'path'

import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    NotFoundException,
    Param,
    Patch,
    Req,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { FileInterceptor } from '@nestjs/platform-express'
import { InjectRepository } from '@nestjs/typeorm'
import { Request } from 'express'
import { Repository } from 'typeorm'

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { DiscordService } from '../discord/discord.service'
import { File } from '../entity/file.entity'
import { S3Service } from '../s3/s3.service'
import { Role } from '../users/role.enum'
import { Roles } from '../users/roles.decorator'
import { RolesGuard } from '../users/roles.guard'
import { User } from '../users/user.entity'
import { GameAlbumDto } from './dto/game-album.dto'
import { GameAlbum } from './entity/game-album.entity'
import { Game } from './entity/game.entity'
import { GamesService } from './services/games.service'
import { IgdbService } from './services/igdb.service'

@Controller('admin/game-album')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin, Role.SuperAdmin)
export class GameAlbumController {
    constructor(
        private gamesService: GamesService,
        private igdbService: IgdbService,
        @InjectRepository(GameAlbum) private gameAlbumRepository: Repository<GameAlbum>,
        @InjectRepository(Game) private gameRepository: Repository<Game>,
        @InjectRepository(File) private fileRepository: Repository<File>,
        private configService: ConfigService,
        private s3Service: S3Service,
        private discordService: DiscordService,
    ) {}

    @Roles(Role.Admin, Role.SuperAdmin)
    @Delete('/:id')
    async delete(@Param('id') id: number, @Req() request: Request): Promise<Game> {
        const user = request.user as User
        const gameAlbum = await this.gameAlbumRepository.findOne({
            relations: {
                game: true,
            },
            where: {
                id,
            },
        })
        if (!gameAlbum) {
            throw new NotFoundException()
        }
        await this.gameAlbumRepository.remove(gameAlbum)
        try {
            void this.discordService.sendUpdateForGame({
                game: gameAlbum.game,
                content: `Album deleted:\n **${gameAlbum.name}**`,
                user,
            })
        } catch (e) {
            console.error(e)
        }
        return this.gamesService.getGameWithMusics(gameAlbum.game.slug)
    }

    @Roles(Role.Admin, Role.SuperAdmin)
    @Patch('/:id')
    async edit(
        @Param('id') id: number,
        @Body() albumDto: GameAlbumDto,
        @Req() request: Request,
    ): Promise<GameAlbum> {
        const user = request.user as User
        const gameAlbum = await this.gameAlbumRepository.findOne({
            relations: { game: true },
            where: {
                id: id,
            },
        })
        if (!gameAlbum) {
            throw new NotFoundException()
        }
        return this.gameAlbumRepository.save({
            ...gameAlbum,
            name: albumDto.name,
            date: albumDto.date,
            updatedBy: user,
        })
    }

    @Roles(Role.Admin, Role.SuperAdmin)
    @UseInterceptors(
        FileInterceptor('file', {
            limits: {
                fileSize: 3145728, // 3 MB
            },
            fileFilter(_req, file, callback) {
                if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
                    callback(
                        new BadRequestException('File must either be a .png or .j(e)pg'),
                        false,
                    )
                }
                callback(null, true)
            },
        }),
    )
    @Patch('/:id/cover')
    async editCover(
        @Param('id') id: number,
        @UploadedFile() file: Express.Multer.File,
    ): Promise<File> {
        let gameAlbum = await this.gameAlbumRepository.findOne({
            relations: {
                game: true,
            },
            where: {
                id: id,
            },
        })
        if (!gameAlbum) {
            throw new NotFoundException()
        }
        const coverPath = `games/${gameAlbum.game.slug}/${Math.random()
            .toString(36)
            .slice(2, 9)}${extname(file.originalname)}`
        await this.s3Service.putObject(
            coverPath,
            file.buffer,
            this.configService.get('AMAZON_S3_PUBLIC_BUCKET'),
        )
        gameAlbum = await this.gameAlbumRepository.save({
            ...gameAlbum,
            cover: this.fileRepository.create({
                path: coverPath,
                originalFilename: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                private: false,
            }),
        })

        return gameAlbum.cover!
    }
}
