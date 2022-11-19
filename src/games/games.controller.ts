import {
    BadRequestException,
    ClassSerializerInterceptor,
    Controller,
    Get,
    HttpCode,
    InternalServerErrorException,
    NotFoundException,
    Param,
    Query,
    Req,
    SerializeOptions,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common'
import { ElasticsearchService } from '@nestjs/elasticsearch'
import { InjectRepository } from '@nestjs/typeorm'
import { Request } from 'express'
import { Repository } from 'typeorm'

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../users/roles.guard'
import { User } from '../users/user.entity'
import { GamesImportDto } from './dto/games-import.dto'
import { GamesSearchDto } from './dto/games-search.dto'
import { Game } from './entity/game.entity'
import { Platform } from './entity/platform.entity'
import { IgdbHttpService } from './http/igdb.http.service'
import { GamesService } from './services/games.service'
import { IgdbService } from './services/igdb.service'
import GameNameSearchBody from './types/game-name-search-body.interface'

@Controller('games')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GamesController {
    constructor(
        private gamesService: GamesService,
        private igdbService: IgdbService,
        @InjectRepository(Game)
        private gamesRepository: Repository<Game>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private elasticsearchService: ElasticsearchService,
        private igdbHttpService: IgdbHttpService,
        @InjectRepository(Platform)
        private platformRepository: Repository<Platform>,
    ) {}

    @Get('')
    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({
        groups: ['game-list'],
    })
    async getAll(
        @Query() query: GamesSearchDto,
        @Req() request: Request,
    ): Promise<{ data: Game[]; count: number }> {
        const user = request.user as User
        let [games, count] = await this.gamesService.findByName(query.query, {
            showDisabled: false,
            limit: query.limit,
            skip: query.skip,
            ...(query.filterByUser && { filterByUser: user }),
        })

        // TODO try mikrORM because i'm writing some mad bullshit to make things work with TypeORM
        // mapping on every game to get a platform name is ridiculous
        // @ts-ignore
        games = await Promise.all(
            games.map(async (game) => {
                const gameIds = await this.gamesService.getGamesIdsForUser(user)
                return {
                    ...game,
                    platforms: await Promise.all(
                        game.platformIds.map(async (id) => {
                            return this.platformRepository.findOneBy({
                                id,
                            })
                        }),
                    ),
                    selectedByUser: gameIds.includes(game.id),
                }
            }),
        )

        return {
            data: games,
            count,
        }
    }

    @Get('import')
    @HttpCode(201)
    async importFromIgdb(@Query() query: GamesImportDto): Promise<string[]> {
        let [igdbGame] = await this.igdbHttpService.importByUrl(query.url)

        if (!igdbGame) throw new NotFoundException('the game was not found')
        if (igdbGame.category !== 0) throw new BadRequestException('The game is not a main game')
        if (igdbGame.version_parent) {
            igdbGame = (await this.igdbHttpService.importByUrl(query.url))[0]
            if (!igdbGame) throw new InternalServerErrorException()
        }

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

    @Get('/:slug/add')
    async addToList(@Param('slug') slug: string, @Req() request: Request): Promise<void> {
        const game = await this.gamesRepository.findOne({
            where: {
                slug,
            },
        })
        if (game === null) {
            throw new NotFoundException()
        }
        const user = request.user as User
        const games = await this.gamesRepository
            .createQueryBuilder('g')
            .leftJoin('g.users', 'user')
            .andWhere('user.id = :id', { id: user.id })
            .getMany()
        await this.userRepository.save({ ...user, games: [...games, game] })
    }

    @Get('/:slug/remove')
    async removeFromList(@Param('slug') slug: string, @Req() request: Request): Promise<void> {
        const gameToRemove = await this.gamesRepository.findOne({
            where: {
                slug,
            },
        })
        if (gameToRemove === null) {
            throw new NotFoundException()
        }
        const user = request.user as User
        const games = await this.gamesRepository
            .createQueryBuilder('g')
            .leftJoin('g.users', 'user')
            .andWhere('user.id = :id', { id: user.id })
            .getMany()
        await this.userRepository.save({
            ...user,
            games: games.filter((game) => game.id !== gameToRemove.id),
        })
    }

    @Get('/names')
    async getNames(
        @Query() query: GamesSearchDto,
    ): Promise<{ highlight: string | undefined; name: string | undefined }[]> {
        // remove accents
        const queryStr = query.query
            .toLowerCase()
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')

        if (queryStr === '') return []

        const { hits } = await this.elasticsearchService.search<GameNameSearchBody>({
            index: 'game_name',
            sort: ['_score', 'name'],
            size: 20,
            query: {
                bool: {
                    should: [
                        {
                            wildcard: {
                                name: {
                                    value: `*${queryStr}*`,
                                },
                            },
                        },
                        {
                            wildcard: {
                                name: {
                                    value: `${queryStr}*`,
                                    boost: 2,
                                },
                            },
                        },
                        { wildcard: { name_slug: `*${queryStr}*` } },
                        {
                            wildcard: {
                                name_slug: {
                                    value: `${queryStr}*`,
                                    boost: 2,
                                },
                            },
                        },
                        {
                            term: {
                                suggest_highlight: {
                                    value: `${queryStr.replace(/([:.,-](\s*)?)/, ' ')}`,
                                    boost: 0,
                                },
                            },
                        },
                    ],
                },
            },
            highlight: {
                type: 'fvh',
                boundary_scanner: 'chars',
                fields: {
                    suggest_highlight: {},
                },
                pre_tags: ['<span class="highlighted">'],
                post_tags: ['</span>'],
            },
        })
        return hits.hits.reduce(
            (previous: { highlight: string | undefined; name: string | undefined }[], item) => {
                if (!previous.some((i) => i.name === item._source?.name)) {
                    return [
                        ...previous,
                        {
                            name: item._source?.name,
                            highlight: item.highlight?.suggest_highlight?.[0],
                        },
                    ]
                }
                return [...previous]
            },
            [],
        )
    }

    @Get('/:slug')
    async get(@Param('slug') slug: string): Promise<Game> {
        const game = await this.gamesRepository.findOne({
            relations: {
                cover: {
                    colorPalette: true,
                },
                alternativeNames: true,
                musics: {
                    derivedGameToMusics: {
                        game: true,
                    },
                    originalGameToMusic: {
                        game: true,
                    },
                },
                platforms: true,
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
        return game
    }
}
