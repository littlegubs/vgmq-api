import { IsUrl } from 'class-validator'

export class GamesImportDto {
    @IsUrl({
        host_whitelist: ['www.igdb.com'],
    })
    url: string
}
