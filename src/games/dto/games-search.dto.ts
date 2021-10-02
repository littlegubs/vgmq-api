import { IsDefined } from 'class-validator'

export class GamesSearchDto {
    @IsDefined()
    query: string

    showDisabled = false

    limit?: number

    page?: number
}
