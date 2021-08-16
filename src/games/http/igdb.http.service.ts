import { HttpService } from '@nestjs/axios'
import { HttpException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AxiosResponse } from 'axios'
import * as FormData from 'form-data'
import { firstValueFrom, forkJoin, Observable } from 'rxjs'
import { MoreThan } from 'typeorm'

import { IgdbClient } from '../entity/igdb.entity'
import { IgdbGame } from '../igdb.type'

type xd = [...[Observable<AxiosResponse<string>>], ...Observable<AxiosResponse<null>>[]]
@Injectable()
export class IgdbHttpService {
    #twitchClientId?: string
    #twitchClientSecret?: string

    constructor(private httpService: HttpService, private configService: ConfigService) {
        this.#twitchClientId = this.configService.get('TWITCH_CLIENT_ID')
        this.#twitchClientSecret = this.configService.get('TWITCH_CLIENT_SECRET')
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
        const formData = new FormData()
        formData.append('client_id', this.#twitchClientId)
        formData.append('client_secret', this.#twitchClientSecret)
        formData.append('grant_type', 'client_credentials')
        return new Promise<string>((resolve) => {
            this.httpService
                .post<{ access_token: string; expires_in: number; token_type: 'bearer' }>(
                    'https://id.twitch.tv/oauth2/token',
                    formData,
                    {
                        headers: formData.getHeaders(),
                    },
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

        let xdd: xd = [this.httpService.get<string>('https://api.igdb.com/v4/games')]
        xdd = [...xdd, this.httpService.get<null>('xdd')]

        forkJoin(xdd).subscribe(([xd, yo]) => {
            xd.data
            yo.data
        })

        return firstValueFrom(
            this.httpService.post<IgdbGame[]>(
                'https://api.igdb.com/v4/games',
                `fields category, parent_game, url, category,alternative_names.name, cover.*, first_release_date, version_parent, name, slug, videos.video_id;
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
