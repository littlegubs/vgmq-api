import { IsNotEmpty } from 'class-validator'

export class AuthLoginDto {
    @IsNotEmpty()
    email: string

    @IsNotEmpty()
    password: string
}
