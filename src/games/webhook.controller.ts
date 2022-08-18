import { Body, Controller, Get, Req } from '@nestjs/common'
import { ElasticsearchService } from '@nestjs/elasticsearch'
import { InjectRepository } from '@nestjs/typeorm'
import { Request } from 'express'
import { Repository } from 'typeorm'

import { User } from '../users/user.entity'
import { Game } from './entity/game.entity'
import { IgdbGame } from './igdb.type'
import { GamesService } from './services/games.service'
import { IgdbService } from './services/igdb.service'

@Controller('games/webhook')
export class WebhookController {
    constructor(
        private gamesService: GamesService,
        private igdbService: IgdbService,
        @InjectRepository(Game)
        private gamesRepository: Repository<Game>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private elasticsearchService: ElasticsearchService,
    ) {}

    @Get('/create')
    async create(@Body() body: IgdbGame, @Req() request: Request): Promise<void> {
        console.log(body)
        console.log(request.header('X-Secret'))

        await this.igdbService.importGame(body)
        return
    }

    @Get('/update')
    async update(@Body() body: IgdbGame, @Req() request: Request): Promise<void> {
        console.log(body)
        console.log(request.header('X-Secret'))

        await this.igdbService.importGame(body)
        return
    }
}
