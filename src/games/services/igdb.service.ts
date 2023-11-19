import { youtube } from '@googleapis/youtube'
import { InjectQueue } from '@nestjs/bull'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Queue } from 'bull'
import { DateTime } from 'luxon'
import Vibrant = require('node-vibrant')
import { Repository } from 'typeorm'

import { User } from '../../users/user.entity'
import { AlternativeName } from '../entity/alternative-name.entity'
import { ColorPalette } from '../entity/color-palette.entity'
import { Cover } from '../entity/cover.entity'
import { Game } from '../entity/game.entity'
import { Platform } from '../entity/platform.entity'
import { Screenshot } from '../entity/screenshot.entity'
import { Video } from '../entity/video.entity'
import { IgdbHttpService } from '../http/igdb.http.service'
import { IgdbGame } from '../igdb.type'

@Injectable()
export class IgdbService {
    constructor(
        private igdbHttpService: IgdbHttpService,
        private configService: ConfigService,
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
        @InjectRepository(Video)
        private videoRepository: Repository<Video>,
        @InjectRepository(Screenshot)
        private screenshotRepository: Repository<Screenshot>,
        @InjectQueue('game')
        private gameQueue: Queue,
    ) {}

    async import(igdbGame: IgdbGame, user?: User): Promise<Game> {
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
            firstReleaseDate: igdbGame.first_release_date
                ? DateTime.fromSeconds(igdbGame.first_release_date).toISO()
                : null,
            enabled: true,
            ...(user && oldGame === null && { addedBy: user }),
            nsfw: Boolean(igdbGame.themes?.some((theme) => theme.slug === 'erotic')),
        })

        const cover = await this.getCover(game, igdbGame.cover)

        const alternativeNames = await this.handleAlternativeNames(game, igdbGame.alternative_names)
        const videos = await this.handleVideos(game, igdbGame.videos)
        const screenshots = await this.handleScreenshots(game, igdbGame.screenshots)

        const [parent, versionParent] = await Promise.all([
            this.getParent(igdbGame.parent_game),
            this.getParent(igdbGame.version_parent),
        ])

        const platforms = await this.handlePlatforms(game, igdbGame.platforms)

        game = {
            ...game,
            parent,
            versionParent,
            ...(cover ? { cover } : undefined),
            ...(alternativeNames ? { alternativeNames } : undefined),
            ...(platforms ? { platforms } : undefined),
            ...(videos ? { videos: videos.filter((v) => v !== undefined) as Video[] } : undefined),
            ...(screenshots ? { screenshots } : undefined),
        }

        game = await this.updateOrCreateGame(game, oldGame)

        await this.gameQueue.add('getSimilarGames', game.id, { removeOnComplete: true })
        return game
    }

    async getParent(parent?: {
        id: number
        url: string
    }): Promise<Promise<Game | undefined> | undefined> {
        if (parent) {
            const [igdbGame] = await this.igdbHttpService.getDataFromUrl(parent.url)

            return igdbGame ? this.import(igdbGame) : undefined
        }
    }

    async getCover(
        game: Game,
        igdbCover?: {
            id: number
            image_id: string
        },
    ): Promise<Cover | undefined> {
        if (igdbCover) {
            const cover = await this.coversRepository.findOne({
                relations: {
                    colorPalette: true,
                },
                where: {
                    igdbId: igdbCover.id,
                },
            })
            if (cover !== null) {
                if (cover.colorPalette) {
                    return cover
                }
                const colorPalette = await Vibrant.from(
                    `https://images.igdb.com/igdb/image/upload/t_1080p/${igdbCover.image_id}.jpg`,
                ).getPalette()
                return {
                    ...cover,
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
                }
            }
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

    async handleVideos(
        game: Game,
        igdbVideos?: Array<{
            id: number
            video_id: string
        }>,
    ): Promise<Array<Video | undefined>> {
        const youtubeApi = youtube({
            version: 'v3',
            auth: this.configService.get('YOUTUBE_API_AUTH'),
        })

        if (Array.isArray(igdbVideos) && igdbVideos.length > 0) {
            return Promise.all(
                igdbVideos.map(async (igdbVideo) => {
                    const video = await this.videoRepository.findOneBy({
                        igdbId: igdbVideo.id,
                    })
                    if (video !== null) {
                        return video
                    }
                    const { data } = await youtubeApi.videos.list({
                        id: [igdbVideo.video_id],
                        part: ['contentDetails'],
                    })
                    if (data.items?.[0]?.contentDetails?.duration) {
                        return this.videoRepository.create({
                            igdbId: igdbVideo.id,
                            videoId: igdbVideo.video_id,
                            duration: data.items[0].contentDetails.duration,
                        })
                    }
                    return undefined
                }),
            )
        }
        return Promise.resolve([])
    }

    async handleScreenshots(
        game: Game,
        igdbImages?: Array<{
            id: number
            image_id: string
        }>,
    ): Promise<Screenshot[]> {
        if (Array.isArray(igdbImages) && igdbImages.length > 0) {
            return Promise.all(
                igdbImages.map(async (igdbImage) => {
                    const screenshot = await this.screenshotRepository.findOneBy({
                        igdbId: igdbImage.id,
                    })
                    if (screenshot !== null) {
                        return screenshot
                    }
                    return this.screenshotRepository.save({
                        igdbId: igdbImage.id,
                        imageId: igdbImage.image_id,
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
                            abbreviation: igdbPlatform.abbreviation ?? igdbPlatform.name,
                        })
                    }
                    return this.platformRepository.save<Platform>({
                        ...platform,
                        name: igdbPlatform.name,
                        abbreviation: igdbPlatform.abbreviation ?? igdbPlatform.name,
                    })
                }),
            )
        }
        return Promise.resolve([])
    }
}
