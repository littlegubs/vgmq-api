import {
    BadRequestException,
    Controller,
    Get,
    HttpCode,
    MessageEvent,
    NotFoundException,
    Param,
    Patch,
    Post,
    Query,
    Sse,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { InjectRepository } from '@nestjs/typeorm'
import { Observable } from 'rxjs'
import { Repository } from 'typeorm'

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Role } from '../users/role.enum'
import { Roles } from '../users/roles.decorator'
import { RolesGuard } from '../users/roles.guard'
import { GamesImportDto } from './dto/games-import.dto'
import { GamesSearchAdminDto } from './dto/games-search-admin.dto'
import { Game } from './entity/game.entity'
import { GameSseService } from './services/game-sse.service'
import { GamesService } from './services/games.service'
import { IgdbService } from './services/igdb.service'

@Controller('admin/games')
export class AdminGamesController {
    constructor(
        private gamesService: GamesService,
        private igdbService: IgdbService,
        @InjectRepository(Game)
        private gamesRepository: Repository<Game>,
        private gameSseService: GameSseService,
    ) {}
    //TODO protect this route
    @Sse('/sse')
    fileUploadSse(): Observable<MessageEvent> {
        return this.gameSseService.sendEvents()
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.Admin)
    @Get('')
    getAll(@Query() query: GamesSearchAdminDto): Promise<{ data: Game[]; count: number }> {
        return this.gamesService
            .findByName(query.query, {
                showDisabled: query.showDisabled,
                limit: query.limit,
                page: query.page,
            })
            .then(([data, count]) => {
                return { data, count }
            })
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.Admin)
    @Get('import')
    @HttpCode(201)
    async importFromIgdb(@Query() query: GamesImportDto): Promise<string[]> {
        const game = await this.igdbService.importByUrl(query.url)
        let gamesImported = [game.name]
        let { parent, versionParent } = game
        while (parent) {
            gamesImported = [...gamesImported, parent.name]
            parent = parent.parent
        }
        while (versionParent) {
            gamesImported = [...gamesImported, versionParent.name]
            versionParent = versionParent.versionParent
        }

        return gamesImported
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.Admin)
    @Get('/:slug')
    async get(@Param('slug') slug: string): Promise<Game> {
        const game = await this.gamesRepository.findOne({
            relations: ['alternativeNames', 'musics'],
            where: {
                slug,
            },
        })
        if (game === undefined) {
            throw new NotFoundException()
        }
        return game
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.Admin)
    @Patch('/:slug/toggle')
    async toggle(@Param('slug') slug: string): Promise<Game> {
        return this.gamesService.toggle(slug)
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.Admin)
    @UseInterceptors(
        FilesInterceptor('files', 100, {
            limits: {
                fileSize: 52428800, // 50 MB
            },
            fileFilter(req, file, callback) {
                if (
                    !['audio/mpeg', 'audio/mp3'].includes(file.mimetype) ||
                    !new RegExp(/.\.(mp3)$/).test(file.originalname)
                ) {
                    callback(new BadRequestException('File must be a valid mp3 file!'), false)
                }
                callback(null, true)
            },
        }),
    )
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.Admin)
    @Post(':slug/musics')
    async uploadMusic(
        @Param('slug') slug: string,
        @UploadedFiles() files: Array<Express.Multer.File>,
    ): Promise<Game> {
        const game = await this.gamesRepository.findOne({
            relations: ['alternativeNames', 'musics'],
            where: {
                slug,
            },
        })
        if (game === undefined) {
            throw new NotFoundException()
        }

        return this.gamesService.uploadMusics(game, files)
    }
}
