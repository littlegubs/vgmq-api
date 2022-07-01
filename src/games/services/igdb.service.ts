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
import Vibrant = require('node-vibrant')
import { Repository } from 'typeorm'

import { AlternativeName } from '../entity/alternative-name.entity'
import { ColorPalette } from '../entity/color-palette.entity'
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
        @InjectRepository(ColorPalette)
        private colorPaletteRepository: Repository<ColorPalette>,
    ) {}

    async importByUrl(url: string): Promise<Game> {
        return this.igdbHttpService
            .importByUrl(url)
            .then(async (res) => {
                const igdbGame = res[0]

                if (!igdbGame) throw new NotFoundException('the game was not found')
                if (!igdbGame.first_release_date)
                    throw new BadRequestException('the game has no release date')

                const oldGame = await this.gamesRepository.findOne({
                    where: {
                        igdbId: igdbGame.id,
                    },
                    relations: ['alternativeNames', 'cover'],
                })

                if (oldGame) {
                    // TODO maybe check if old game is not already being played in a lobby, and prevent from updating, as bugs could occur
                    if (oldGame.cover) {
                        await this.coversRepository.remove(oldGame.cover)
                    }
                    await this.alternativeNamesRepository.remove(oldGame.alternativeNames)
                }

                let game = this.gamesRepository.create({
                    igdbId: igdbGame.id,
                    category: igdbGame.category,
                    name: igdbGame.name,
                    url: igdbGame.url,
                    slug: igdbGame.slug,
                    firstReleaseDate: DateTime.fromSeconds(igdbGame.first_release_date).toISO(),
                })

                const cover = await this.getCover(game, igdbGame.cover)

                const alternativeNames = this.handleAlternativeNames(
                    game,
                    igdbGame.alternative_names,
                )

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
    ): AlternativeName[] | undefined {
        if (Array.isArray(igdbAlternativeNames) && igdbAlternativeNames.length > 0) {
            return igdbAlternativeNames.map((alternativeName) => {
                return this.alternativeNamesRepository.create({
                    igdbId: alternativeName.id,
                    name: alternativeName.name,
                })
            })
        }
    }
}
