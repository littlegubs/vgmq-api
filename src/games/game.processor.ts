import { Process, Processor } from '@nestjs/bull'
import { ElasticsearchService } from '@nestjs/elasticsearch'
import { InjectRepository } from '@nestjs/typeorm'
import { Job } from 'bull'
import { Repository } from 'typeorm'

import { User } from '../users/user.entity'
import { Game } from './entity/game.entity'
import { IgdbHttpService } from './http/igdb.http.service'
import { GamesService } from './services/games.service'
import { IgdbService } from './services/igdb.service'

@Processor('game')
export class GameProcessor {
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

    @Process('getSimilarGames')
    async getSimilarGames(job: Job<number>): Promise<void> {
        const game = await this.gamesRepository.findOne({
            relations: {
                musics: true,
            },
            where: {
                id: job.data,
            },
        })
        if (game !== null && game.musics.length > 0) {
            const [igdbGame] = await this.igdbHttpService.importByUrl(game.url)

            if (!igdbGame) return
            let similarGames: Game[] = []
            if (igdbGame.similar_games) {
                for (const igdbSimilarGame of igdbGame.similar_games) {
                    const similarGame = await this.igdbService.getSimilarGame(igdbSimilarGame)
                    if (similarGame) similarGames = [...similarGames, similarGame]
                }
            }
            await this.gamesRepository.save({ ...game, similarGames })
        }
    }
}
