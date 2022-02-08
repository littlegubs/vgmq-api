import { HttpService } from '@nestjs/axios'
import { HttpException, Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'
import { MoreThan } from 'typeorm'

import { IgdbClient } from '../entity/igdb.entity'
import { IgdbGame } from '../igdb.type'
import {AxiosResponse} from "axios";

@Injectable()
export class IgdbHttpService {
    #twitchClientId: string
    #twitchClientSecret: string

    constructor(private httpService: HttpService, private configService: ConfigService) {
        const twitchClientId = this.configService.get('TWITCH_CLIENT_ID')
        const twitchClientSecret = this.configService.get('TWITCH_CLIENT_SECRET')

        if (twitchClientId === undefined || twitchClientSecret === undefined) {
            throw new InternalServerErrorException()
        }
        this.#twitchClientId = twitchClientId
        this.#twitchClientSecret = twitchClientSecret
    }

    async getAccessToken(): Promise<string> {
        const date = new Date()
        date.setDate(date.getDate() - 30)
        const igdbClient = await IgdbClient.findOne({
            where: {
                updatedAt: MoreThan(date),
            },
        })
        if (igdbClient !== undefined) {
            return igdbClient.accessToken
        }
        if (this.#twitchClientId === undefined || this.#twitchClientSecret === undefined) {
            throw new HttpException('missing twitch client properties', 500)
        }

        return new Promise<string>((resolve) => {
            this.httpService
                .post<{ access_token: string; expires_in: number; token_type: 'bearer' }>(
                    `https://id.twitch.tv/oauth2/token?client_id=${
                        this.#twitchClientId
                    }&client_secret=${this.#twitchClientSecret}&grant_type=client_credentials`,
                    null,
                )
                .subscribe({
                    next: async (res) => {
                        await IgdbClient.clear()
                        resolve(
                            IgdbClient.create({ accessToken: res.data.access_token })
                                .save()
                                .then((igdbClient) => {
                                    return igdbClient.accessToken
                                }),
                        )
                    },
                    error: () => {
                        throw new HttpException('igdb get token failed', 500)
                    },
                })
        })
    }

    async importByUrl(url: string): Promise<AxiosResponse<IgdbGame[]>> {
        const accessToken = await this.getAccessToken()

        return firstValueFrom(
            this.httpService.post<IgdbGame[]>(
                'https://api.igdb.com/v4/games',
                `fields category, parent_game.url, url, category,alternative_names.name, cover.*, first_release_date, version_parent.url, name, slug, videos.video_id;
                sort popularity desc; 
                limit 500; 
                where url = "${url}";`,
                {
                    headers: {
                        'Client-ID': this.#twitchClientId,
                        Authorization: `Bearer ${accessToken}`,
                    },
                },
            ),
        )
    }
}
