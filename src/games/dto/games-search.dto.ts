import { IsDefined } from 'class-validator'

export class GamesSearchDto {
    @IsDefined()
    query: string

    limit = 50

    page = 1
}
