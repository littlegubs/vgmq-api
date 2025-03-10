import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AxiosResponse } from 'axios'
import { Observable, of } from 'rxjs'

@Injectable()
export class DiscordHttpService {
    private discordBotToken?: string

    constructor(private httpService: HttpService, private configService: ConfigService) {
        const discordBotToken = this.configService.get('DISCORD_BOT_TOKEN')

        if (discordBotToken === undefined) {
            console.warn('no Discord bot token set, no Discord message will be sent')
        }
        this.discordBotToken = discordBotToken
    }

    sendMessage(content: {
        embeds: [
            {
                title?: string
                description?: string
                color?: number
                footer?: {
                    text: string
                }
                url?: string
                image?: { url: string }
                thumbnail?: { url: string }
            },
        ]
    }): Observable<null> | Observable<AxiosResponse<any>> {
        if (this.discordBotToken === undefined) {
            console.warn('no Discord bot token set, no Discord message will be sent')
            return of(null)
        }
        return this.httpService.post(
            `https://discord.com/api/channels/${this.configService.get(
                'DISCORD_MODS_CHANNEL_ID',
            )}/messages`,
            content,
            {
                headers: {
                    Authorization: `Bot ${this.discordBotToken}`,
                },
            },
        )
    }
}
