import { IsDefined } from 'class-validator'

export class GamesSearchAdminDto {
    @IsDefined()
    query: string

    showDisabled = false

    onlyShowWithoutMusics = false

    limit?: number

    page?: number
}
