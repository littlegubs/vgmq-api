import { IsNotEmpty } from 'class-validator'

export class GameToMusicEditDto {
    @IsNotEmpty()
    title: string

    artist: string
}
