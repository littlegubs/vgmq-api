import { IsDefined } from 'class-validator'

export class GamesSearchAdminDto {
    @IsDefined()
    query: string

    showDisabled = false

    limit?: number

    page?: number
}
