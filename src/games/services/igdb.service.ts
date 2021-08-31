import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
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
        return this.igdbHttpService.importByUrl(url).then(async (res) => {
            const igdbGame = res.data[0]

            if (!igdbGame) throw new BadRequestException('the game was not found')
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

            const igdbCover = igdbGame.cover
            if (igdbCover !== undefined) {
                if (oldGame?.cover) {
                    await this.coversRepository.update(igdbCover.id, {
                        ...game.cover,
                        imageId: igdbCover.image_id,
                    })
                } else {
                    game = {
                        ...game,
                        cover: await this.coversRepository.save(
                            this.coversRepository.create({
                                igdbId: igdbCover.id,
                                imageId: igdbCover.image_id,
                                game: game,
                            }),
                        ),
                    }
                }
            } else if (oldGame?.cover) await this.coversRepository.remove(oldGame.cover)

            if (igdbGame.parent_game !== undefined) {
                try {
                    game = { ...game, parent: await this.importByUrl(igdbGame.parent_game.url) }
                } catch (error) {
                    // maybe log this, but shouldn't throw
                }
            }
            if (igdbGame.version_parent !== undefined) {
                try {
                    game = {
                        ...game,
                        versionParent: await this.importByUrl(igdbGame.version_parent.url),
                    }
                } catch (error) {
                    // maybe log this, but shouldn't throw
                }
            } else {
                game = {
                    ...game,
                    versionParent: undefined,
                }
            }

            game = oldGame
                ? await this.gamesRepository.update(oldGame.id, game).then(
                      async () =>
                          (await this.gamesRepository.findOne({
                              where: {
                                  id: oldGame.id,
                              },
                              relations: ['parent', 'versionParent'],
                          }))!,
                  )
                : await this.gamesRepository.save(game)

            const igdbAlternativeNames = igdbGame.alternative_names
            if (igdbAlternativeNames !== undefined && igdbAlternativeNames?.length > 0) {
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
                        await this.alternativeNamesRepository.save(
                            this.alternativeNamesRepository.create({
                                igdbId: alternativeName.id,
                                name: alternativeName.name,
                                game: game,
                            }),
                        )
                    }
                }
            }

            return game
        })
    }
}
