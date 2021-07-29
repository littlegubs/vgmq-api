import {ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface} from "class-validator";
import {Injectable} from "@nestjs/common";
import {ConfigService} from "@nestjs/config";

@ValidatorConstraint({name: 'LimitedAccess'})
@Injectable()
export class LimitedAccessValidator implements ValidatorConstraintInterface {

    constructor(private configService: ConfigService) {
    }

    validate(value: string, args) {
        return value === this.configService.get('LIMITED_ACCESS_PASSWORD');
    }

    defaultMessage(args: ValidationArguments) {
        return `invalid password`;
    }
}
