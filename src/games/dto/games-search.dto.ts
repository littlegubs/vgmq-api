import { IsDefined } from 'class-validator'

export class GamesSearchDto {
    @IsDefined()
    query: string

    filterByUser = false

    limit?: number

    skip?: number
}
