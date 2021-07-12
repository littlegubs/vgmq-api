import {IsEmail, IsNotEmpty, Validate} from "class-validator";
import {UserExistsRule} from "./unique.validator";

export class CreateUserDto {
    @IsEmail()
    @Validate(UserExistsRule)
    email: string;

    @Validate(UserExistsRule)
    username: string;

    @IsNotEmpty()
    password: string;
}
