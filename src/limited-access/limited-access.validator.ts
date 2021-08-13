import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
    ValidationArguments,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator'

@ValidatorConstraint({ name: 'LimitedAccess' })
@Injectable()
export class LimitedAccessValidator implements ValidatorConstraintInterface {
    constructor(private configService: ConfigService) {}

    validate(value: string): boolean {
        return value === this.configService.get('LIMITED_ACCESS_PASSWORD')
    }

    defaultMessage(args: ValidationArguments): string {
        return 'invalid password'
    }
}
