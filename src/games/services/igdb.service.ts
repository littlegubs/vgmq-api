import {
    BadRequestException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import axios, { AxiosError } from 'axios'
import { DateTime } from 'luxon'
import { Repository } from 'typeorm'

import { AlternativeName } from '../entity/alternative-name.entity'
import { Cover } from '../entity/cover.entity'
import { Game } from '../entity/game.entity'
import { IgdbHttpService } from '../http/igdb.http.service'

@Injectable()
export class IgdbService {
    constructor(
        private igdbHttpService: IgdbHttpService,
        @InjectRepository(Game)
        private gamesRepository: Repository<Game>,
        @InjectRepository(Cover)
        private coversRepository: Repository<Cover>,
        @InjectRepository(AlternativeName)
        private alternativeNamesRepository: Repository<AlternativeName>,
    ) {}

    async importByUrl(url: string): Promise<Game> {
        return this.igdbHttpService
            .importByUrl(url)
            .then(async (res) => {
                const igdbGame = res.data[0]

                if (!igdbGame) throw new NotFoundException('the game was not found')
                if (!igdbGame.first_release_date)
                    throw new BadRequestException('the game has no release date')

                const oldGame = await this.gamesRepository.findOne({
                    where: {
                        igdbId: igdbGame.id,
                    },
                    relations: ['alternativeNames', 'cover'],
                })
                let game = this.gamesRepository.create({
                    igdbId: igdbGame.id,
                    category: igdbGame.category,
                    name: igdbGame.name,
                    url: igdbGame.url,
                    slug: igdbGame.slug,
                    firstReleaseDate: DateTime.fromSeconds(igdbGame.first_release_date).toISO(),
                })
                const cover = await this.getCover(game, igdbGame.cover, oldGame?.cover)
                game = { ...game, ...(cover ? { cover } : undefined) }

                const [parent, versionParent] = await Promise.all([
                    this.getParent(igdbGame.parent_game),
                    this.getParent(igdbGame.version_parent),
                ])

                game = {
                    ...game,
                    parent,
                    versionParent,
                }

                game = await this.updateOrCreateGame(game, oldGame)

                await this.handleAlternativeNames(game, igdbGame.alternative_names, oldGame)

                return game
            })
            .catch((err: Error | AxiosError) => {
                if (axios.isAxiosError(err)) {
                    if (err.response?.status === 429) {
                        throw new HttpException(
                            'IGDB api limit reached, please try again later',
                            429,
                        )
                    }
                }
                throw new InternalServerErrorException()
            })
    }

    getParent(parent?: { id: number; url: string }): Promise<Game | undefined> | undefined {
        return parent ? this.importByUrl(parent.url).catch(() => undefined) : undefined
    }

    async getCover(
        game: Game,
        igdbCover?: {
            id: number
            image_id: string
        },
        oldGameCover?: Cover | null,
    ): Promise<Cover | undefined> {
        if (igdbCover) {
            if (oldGameCover) {
                await this.coversRepository.update(igdbCover.id, {
                    ...game.cover,
                    imageId: igdbCover.image_id,
                })
            } else {
                return this.coversRepository.save({
                    igdbId: igdbCover.id,
                    imageId: igdbCover.image_id,
                    game,
                })
            }
        } else if (oldGameCover) await this.coversRepository.remove(oldGameCover)
    }
    updateOrCreateGame(game: Game, oldGame?: Game): Promise<Game> {
        return oldGame
            ? this.gamesRepository.update(oldGame.id, game).then(async () => {
                  return (await this.gamesRepository.findOne({
                      where: {
                          id: oldGame.id,
                      },
                      relations: ['parent', 'versionParent'],
                  }))!
              })
            : this.gamesRepository.save(game)
    }
    async handleAlternativeNames(
        game: Game,
        igdbAlternativeNames?: Array<{
            id: number
            name: string
        }>,
        oldGame?: Game,
    ): Promise<void> {
        if (Array.isArray(igdbAlternativeNames) && igdbAlternativeNames.length > 0) {
            if (oldGame) {
                const alternativeNamesToRemove = oldGame.alternativeNames.filter(
                    (oldAlternativeName) =>
                        !igdbAlternativeNames
                            .map((igdbAlternativeName) => igdbAlternativeName.id)
                            .includes(oldAlternativeName.igdbId),
                )
                await this.alternativeNamesRepository.remove(alternativeNamesToRemove)
            }
            for (const alternativeName of igdbAlternativeNames) {
                const oldAlternativeName = await this.alternativeNamesRepository.findOne({
                    where: { igdbId: alternativeName.id },
                })

                if (oldAlternativeName) {
                    await this.alternativeNamesRepository.update(oldAlternativeName.id, {
                        ...oldAlternativeName,
                        name: alternativeName.name,
                        game: game,
                    })
                } else {
                    await this.alternativeNamesRepository.save({
                        igdbId: alternativeName.id,
                        name: alternativeName.name,
                        game: game,
                    })
                }
            }
        }
    }
}
