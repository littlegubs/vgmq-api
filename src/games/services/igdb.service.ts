import {
    HttpException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import axios, { AxiosError } from 'axios'
import { DateTime } from 'luxon'
import Vibrant = require('node-vibrant')
import { Repository } from 'typeorm'

import { AlternativeName } from '../entity/alternative-name.entity'
import { ColorPalette } from '../entity/color-palette.entity'
import { Cover } from '../entity/cover.entity'
import { Game } from '../entity/game.entity'
import { Platform } from '../entity/platform.entity'
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
        @InjectRepository(ColorPalette)
        private colorPaletteRepository: Repository<ColorPalette>,
        @InjectRepository(Platform)
        private platformRepository: Repository<Platform>,
    ) {}

    async importByUrl(url: string): Promise<Game> {
        return this.igdbHttpService
            .importByUrl(url)
            .then(async (res) => {
                const igdbGame = res[0]

                if (!igdbGame) throw new NotFoundException('the game was not found')

                const oldGame = await this.gamesRepository.findOne({
                    where: {
                        igdbId: igdbGame.id,
                    },
                    relations: ['alternativeNames', 'cover'],
                })

                if (oldGame) {
                    // TODO stop deleting cover when color palette choice is in place
                    if (oldGame.cover) {
                        await this.coversRepository.remove(oldGame.cover)
                    }
                }

                let game = this.gamesRepository.create({
                    igdbId: igdbGame.id,
                    category: igdbGame.category,
                    name: igdbGame.name,
                    url: igdbGame.url,
                    slug: igdbGame.slug,
                    firstReleaseDate: igdbGame.first_release_date
                        ? DateTime.fromSeconds(igdbGame.first_release_date).toISO()
                        : null,
                })

                const cover = await this.getCover(game, igdbGame.cover)

                const alternativeNames = await this.handleAlternativeNames(
                    game,
                    igdbGame.alternative_names,
                )
                const platforms = await this.handlePlatforms(game, igdbGame.platforms)

                const [parent, versionParent] = await Promise.all([
                    this.getParent(igdbGame.parent_game),
                    this.getParent(igdbGame.version_parent),
                ])

                game = {
                    ...game,
                    parent,
                    versionParent,
                    ...(cover ? { cover } : undefined),
                    ...(alternativeNames ? { alternativeNames } : undefined),
                    ...(platforms ? { platforms } : undefined),
                }

                return this.updateOrCreateGame(game, oldGame)
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
    ): Promise<Cover | undefined> {
        if (igdbCover) {
            const colorPalette = await Vibrant.from(
                `https://images.igdb.com/igdb/image/upload/t_1080p/${igdbCover.image_id}.jpg`,
            ).getPalette()
            return this.coversRepository.create({
                igdbId: igdbCover.id,
                imageId: igdbCover.image_id,
                colorPalette: this.colorPaletteRepository.create({
                    vibrantHex: colorPalette.Vibrant?.hex,
                    mutedHex: colorPalette.Muted?.hex,
                    darkMutedHex: colorPalette.DarkMuted?.hex,
                    darkVibrantHex: colorPalette.DarkVibrant?.hex,
                    lightMutedHex: colorPalette.LightMuted?.hex,
                    lightVibrantHex: colorPalette.LightVibrant?.hex,
                    backgroundColorHex: colorPalette.DarkVibrant?.hex,
                    colorHex: colorPalette.Vibrant?.hex,
                }),
            })
        }
    }

    updateOrCreateGame(game: Game, oldGame: Game | null): Promise<Game> {
        return this.gamesRepository.save(oldGame ? { ...game, id: oldGame.id } : game)
    }

    handleAlternativeNames(
        game: Game,
        igdbAlternativeNames?: Array<{
            id: number
            name: string
        }>,
    ): Promise<AlternativeName[]> {
        if (Array.isArray(igdbAlternativeNames) && igdbAlternativeNames.length > 0) {
            return Promise.all(
                igdbAlternativeNames.map(async (igdbAlternativeName) => {
                    const alternativeName = await this.alternativeNamesRepository.findOneBy({
                        igdbId: igdbAlternativeName.id,
                    })
                    if (alternativeName === null) {
                        return this.alternativeNamesRepository.create({
                            igdbId: igdbAlternativeName.id,
                            name: igdbAlternativeName.name,
                        })
                    }
                    return this.alternativeNamesRepository.save<AlternativeName>({
                        ...alternativeName,
                        name: igdbAlternativeName.name,
                    })
                }),
            )
        }
        return Promise.resolve([])
    }

    handlePlatforms(
        game: Game,
        igdbPlatforms?: Array<{
            id: number
            name: string
            abbreviation: string
        }>,
    ): Promise<Platform[]> {
        console.log(igdbPlatforms)
        if (Array.isArray(igdbPlatforms) && igdbPlatforms.length > 0) {
            return Promise.all(
                igdbPlatforms.map(async (igdbPlatform) => {
                    const platform = await this.platformRepository.findOneBy({
                        igdbId: igdbPlatform.id,
                    })
                    if (platform === null) {
                        return this.platformRepository.create({
                            igdbId: igdbPlatform.id,
                            name: igdbPlatform.name,
                            abbreviation: igdbPlatform.abbreviation,
                        })
                    }
                    return this.platformRepository.save<Platform>({
                        ...platform,
                        name: igdbPlatform.name,
                        abbreviation: igdbPlatform.abbreviation,
                    })
                }),
            )
        }
        return Promise.resolve([])
    }
}
