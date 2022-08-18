import { Body, Controller, Post, Req } from '@nestjs/common'
import { ElasticsearchService } from '@nestjs/elasticsearch'
import { InjectRepository } from '@nestjs/typeorm'
import { Request } from 'express'
import { Repository } from 'typeorm'

import { User } from '../users/user.entity'
import { Game } from './entity/game.entity'
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

    @Post('/create')
    getAll(@Body() body: any, @Req() request: Request): void {
        console.log(body)
        return
    }
}
