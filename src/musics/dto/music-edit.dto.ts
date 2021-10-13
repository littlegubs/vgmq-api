import { IsNotEmpty } from 'class-validator'

export class MusicEditDto {
    @IsNotEmpty()
    title: string

    artist: string
}
