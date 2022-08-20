import { Body, Controller, HttpCode, Post, Req, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
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
        private configService: ConfigService,
    ) {}

    //todo do everything in queues to reply faster
    @Post('/create')
    @HttpCode(200)
    async create(@Body() body: IgdbGame, @Req() request: Request): Promise<void> {
        if (request.header('X-Secret') !== this.configService.get('IGDB_WEBHOOK_SECRET')) {
            throw new UnauthorizedException()
        }

        if (body.category === 0) {
            await this.igdbService.importByUrl(body.url)
        }
        return
    }

    @Post('/update')
    @HttpCode(200)
    async update(@Body() body: IgdbGame, @Req() request: Request): Promise<void> {
        if (request.header('X-Secret') !== this.configService.get('IGDB_WEBHOOK_SECRET')) {
            throw new UnauthorizedException()
        }

        const game = await this.gamesRepository.find({
            where: {
                igdbId: body.id,
            },
        })
        if (game !== null) {
            await this.igdbService.importByUrl(body.url)
            return
        }
        if (body.category === 0) {
            await this.igdbService.importByUrl(body.url)
        }
        return
    }

    @Post('/delete')
    @HttpCode(200)
    async delete(@Body() body: IgdbGame, @Req() request: Request): Promise<void> {
        if (request.header('X-Secret') !== this.configService.get('IGDB_WEBHOOK_SECRET')) {
            throw new UnauthorizedException()
        }

        // get a game without music, so we don't delete a game with musics
        const game = await this.gamesRepository
            .createQueryBuilder('game')
            .leftJoin('game.musics', 'music')
            .andWhere('music.id IS NULL')
            .andWhere('game.igdbId = :igdbId', { igdbId: body.id })
            .getOne()

        if (game === null) {
            return
        }
        await this.gamesRepository.remove(game)
        return
    }
}
