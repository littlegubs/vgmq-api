import { Transform } from 'class-transformer'
import { IsNotEmpty } from 'class-validator'

export class LobbyCreateDto {
    @IsNotEmpty()
    @Transform(({ value }) => {
        return 'string' === typeof value ? value.trim() : value
    })
    name: string

    @Transform(({ value }) => {
        if ('string' === typeof value) {
            value = value.trim()
            if (value === '') {
                return null
            }
        }
        return value
    })
    password: string | null
    musicNumber: number
}
