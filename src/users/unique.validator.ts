import { Injectable } from '@nestjs/common'
import {
    ValidationArguments,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator'

import { User } from './user.entity'

@ValidatorConstraint({ name: 'UserExists', async: true })
@Injectable()
export class UserExistsRule implements ValidatorConstraintInterface {
    async validate(value: string, args: ValidationArguments): Promise<boolean> {
        const { property } = args
        try {
            await User.findOneOrFail({
                where: {
                    [property]: value,
                },
            })
        } catch (e) {
            return true
        }

        return false
    }

    defaultMessage(args: ValidationArguments): string {
        const { property } = args
        return `${property} already exists`
    }
}
