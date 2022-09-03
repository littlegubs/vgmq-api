import { Transform } from 'class-transformer'
import { IsNotEmpty, IsNumber, Max, Min } from 'class-validator'

import { LobbyDifficulties, LobbyGameModes } from '../entities/lobby.entity'

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

    @Max(100)
    @Min(5)
    @IsNumber()
    musicNumber: number

    @Max(60)
    @Min(5)
    @IsNumber()
    guessTime: number

    allowDuplicates: boolean

    difficulty: LobbyDifficulties[]

    allowContributeToMissingData: boolean

    gameMode: LobbyGameModes
}
