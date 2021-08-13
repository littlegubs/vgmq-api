import { IsEmail, IsNotEmpty, Validate } from 'class-validator'

import { UserExistsRule } from '../../users/unique.validator'

export class AuthRegisterDto {
    @IsEmail()
    @Validate(UserExistsRule)
    email: string

    @Validate(UserExistsRule)
    username: string

    @IsNotEmpty()
    password: string
}
