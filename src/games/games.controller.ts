import {
    ClassSerializerInterceptor,
    Controller,
    Get,
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
import { GamesSearchDto } from './dto/games-search.dto'
import { Game } from './entity/game.entity'
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
    ) {}

    @UseInterceptors(ClassSerializerInterceptor)
    @Get('')
    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({
        groups: ['game-list'],
    })
    getAll(
        @Query() query: GamesSearchDto,
        @Req() request: Request,
    ): Promise<{ data: Game[]; count: number }> {
        const user = request.user as User
        return this.gamesService
            .findByName(query.query, {
                showDisabled: false,
                limit: query.limit,
                skip: query.skip,
                ...(query.filterByUser && { filterByUser: user }),
            })
            .then(async ([data, count]) => {
                const gameIds = await this.gamesService.getGamesIdsForUser(user)
                return {
                    data: data.map((game) => ({
                        ...game,
                        selectedByUser: gameIds.includes(game.id),
                    })),
                    count,
                }
            })
    }

    @Get('/:slug/add')
    async addToList(@Param('slug') slug: string, @Req() request: Request): Promise<void> {
        const game = await this.gamesRepository.findOne({
            where: {
                slug,
            },
        })
        if (game === undefined) {
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
        if (gameToRemove === undefined) {
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
        const hits2 = hits.hits
        return hits2.reduce(
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
}
