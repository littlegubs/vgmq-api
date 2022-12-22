import { Process, Processor } from '@nestjs/bull'
import { ElasticsearchService } from '@nestjs/elasticsearch'
import { InjectRepository } from '@nestjs/typeorm'
import { Job } from 'bull'
import { Repository } from 'typeorm'

import { User } from '../users/user.entity'
import { Game } from './entity/game.entity'
import { IgdbHttpService } from './http/igdb.http.service'
import { IgdbGame } from './igdb.type'
import { GamesService } from './services/games.service'
import { IgdbService } from './services/igdb.service'

@Processor('igdbWebhook')
export class IgdbWebhookProcessor {
    constructor(
        private gamesService: GamesService,
        private igdbService: IgdbService,
        @InjectRepository(Game)
        private gamesRepository: Repository<Game>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private elasticsearchService: ElasticsearchService,
        private igdbHttpService: IgdbHttpService,
    ) {}

    @Process('gameUpdate')
    async gameUpdate(job: Job<IgdbGame>): Promise<void> {
        const game = await this.gamesRepository.find({
            where: {
                igdbId: job.data.id,
            },
        })
        if (game !== null) {
            const [igdbGame] = await this.igdbHttpService.importByUrl(job.data.url)

            if (!igdbGame) return
            await this.igdbService.import(igdbGame)
        }
    }

    @Process('gameRemove')
    async gameRemove(job: Job<IgdbGame>): Promise<void> {
        // get a game without music, so we don't delete a game with musics
        const game = await this.gamesRepository
            .createQueryBuilder('game')
            .leftJoin('game.musics', 'music')
            .andWhere('music.id IS NULL')
            .andWhere('game.igdbId = :igdbId', { igdbId: job.data.id })
            .getOne()

        if (game === null) {
            return
        }
        await this.gamesRepository.remove(game)
        return
    }
}
