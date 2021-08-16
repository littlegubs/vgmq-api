import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { Cover } from '../entity/cover.entity'
import { Game } from '../entity/game.entity'
import { IgdbHttpService } from '../http/igdb.http.service'

@Injectable()
export class IgdbService {
    constructor(
        private igdbHttpService: IgdbHttpService,
        @InjectRepository(Game)
        private gamesRepository: Repository<Game>,
    ) {}

    async importByUrl(url: string): Promise<void> {
        await this.igdbHttpService.importByUrl(url).then(async (res) => {
            const igdbGame = res.data[0]
            if (!igdbGame) {
                throw new BadRequestException('the game was not found')
            }
            const game = await this.gamesRepository.findOne({
                where: {
                    igdbId: igdbGame.id,
                },
            })
            if (game === undefined) {
                const igdbCover = igdbGame.cover
                if (igdbCover !== undefined) {
                    const cover = new Cover()
                    cover.igdbId = igdbCover.id
                    cover.imageId = igdbCover.image_id
                }
            } else {
                await this.gamesRepository.update(game.id, {
                    url: igdbGame.url,
                })
            }
        })
    }
}
