import { IsNotEmpty } from 'class-validator'

export class GamesSearchDto {
    @IsNotEmpty()
    query: string
}
