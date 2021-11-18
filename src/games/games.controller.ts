import { Controller, Get, NotFoundException, Param, Query, Req, UseGuards } from '@nestjs/common'
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

    @Get('')
    getAll(
        @Query() query: GamesSearchDto,
        @Req() request: Request,
    ): Promise<{ data: Game[]; count: number }> {
        return this.gamesService
            .findByName(query.query, {
                limit: query.limit,
                page: query.page,
                ...(query.filterByUser && { filterByUser: request.user as User }),
            })
            .then(([data, count]) => {
                return { data, count }
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
    async addFromList(@Param('slug') slug: string, @Req() request: Request): Promise<void> {
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
}
