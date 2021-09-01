import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import {
    ValidationArguments,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator'
import { Repository } from 'typeorm'

import { User } from './user.entity'

@ValidatorConstraint({ name: 'UserExists', async: true })
@Injectable()
export class UserExistsRule implements ValidatorConstraintInterface {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) {}

    async validate(value: string, args: ValidationArguments): Promise<boolean> {
        const { property } = args
        try {
            await this.usersRepository.findOneOrFail({
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
