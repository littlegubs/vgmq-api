import {
    BadRequestException,
    ClassSerializerInterceptor,
    Controller,
    Get,
    HttpCode,
    NotFoundException,
    Param,
    Patch,
    Post,
    Query,
    SerializeOptions,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { FilesInterceptor } from '@nestjs/platform-express'
import { InjectRepository } from '@nestjs/typeorm'
import checkDiskSpace from 'check-disk-space'
import { Repository } from 'typeorm'

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Role } from '../users/role.enum'
import { Roles } from '../users/roles.decorator'
import { RolesGuard } from '../users/roles.guard'
import { GamesImportDto } from './dto/games-import.dto'
import { GamesSearchAdminDto } from './dto/games-search-admin.dto'
import { Game } from './entity/game.entity'
import { IgdbHttpService } from './http/igdb.http.service'
import { GamesService } from './services/games.service'
import { IgdbService } from './services/igdb.service'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/games')
export class AdminGamesController {
    constructor(
        private gamesService: GamesService,
        private igdbService: IgdbService,
        @InjectRepository(Game)
        private gamesRepository: Repository<Game>,
        private configService: ConfigService,
        private igdbHttpService: IgdbHttpService,
    ) {}

    @Roles(Role.Admin)
    @Get('')
    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({
        groups: ['game-list'],
    })
    getAll(@Query() query: GamesSearchAdminDto): Promise<{ data: Game[]; count: number }> {
        return this.gamesService
            .findByName(query.query, {
                showDisabled: query.showDisabled,
                onlyShowWithoutMusics: query.onlyShowWithoutMusics,
                limit: query.limit,
                skip: query.skip,
            })
            .then(([data, count]) => {
                return { data, count }
            })
    }

    @Roles(Role.Admin)
    @Get('import')
    @HttpCode(201)
    async importFromIgdb(@Query() query: GamesImportDto): Promise<string[]> {
        const [igdbGame] = await this.igdbHttpService.importByUrl(query.url)

        if (!igdbGame) throw new NotFoundException('the game was not found')

        const game = await this.igdbService.import(igdbGame)
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

    @Roles(Role.Admin)
    @Get('/:slug')
    async get(@Param('slug') slug: string): Promise<{ game: Game; free: number; size: number }> {
        const game = await this.gamesRepository.findOne({
            relations: {
                alternativeNames: true,
                musics: {
                    derivedGameToMusics: {
                        game: true,
                    },
                    originalGameToMusic: {
                        game: true,
                    },
                },
            },
            where: {
                slug,
            },
            order: {
                musics: {
                    id: 'ASC',
                },
            },
        })
        if (game === null) {
            throw new NotFoundException()
        }
        const { free, size } = await checkDiskSpace(
            this.configService.get('DISK_SPACE_PATH') ?? '/',
        )
        return { game, free, size }
    }

    @Roles(Role.Admin)
    @Patch('/:slug/toggle')
    async toggle(@Param('slug') slug: string): Promise<Game> {
        return this.gamesService.toggle(slug)
    }

    @Roles(Role.Admin)
    @UseInterceptors(
        FilesInterceptor('files', 200, {
            limits: {
                fileSize: 157286400, // 150 MB
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
    @Roles(Role.Admin)
    @Post(':slug/musics')
    async uploadMusic(
        @Param('slug') slug: string,
        @UploadedFiles() files: Array<Express.Multer.File>,
    ): Promise<Game> {
        const game = await this.gamesRepository.findOne({
            relations: {
                alternativeNames: true,
                musics: {
                    derivedGameToMusics: {
                        game: true,
                    },
                    originalGameToMusic: {
                        game: true,
                    },
                },
            },
            where: {
                slug,
            },
        })
        if (game === null) {
            throw new NotFoundException()
        }

        return this.gamesService.uploadMusics(game, files)
    }
}
