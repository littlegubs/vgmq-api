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
        await this.userRepository.save({ ...user, games: [...user.games, game] })
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
        await this.userRepository.save({
            ...user,
            games: user.games.filter((game) => game.id !== gameToRemove.id),
        })
    }

    @Get('/names')
    async getNames(@Query() query: GamesSearchDto): Promise<string[]> {
        return this.gamesService.getNamesForQuery(query.query)
    }
}
