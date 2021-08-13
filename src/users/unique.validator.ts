import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { User } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@ValidatorConstraint({ name: 'UserExists', async: true })
@Injectable()
export class UserExistsRule implements ValidatorConstraintInterface {
  async validate(value: string, args) {
    const { property } = args;
    try {
      await User.findOneOrFail({
        where: {
          [property]: value,
        },
      });
    } catch (e) {
      return true;
    }

    return false;
  }

  defaultMessage(args: ValidationArguments) {
    const { property } = args;
    return `${property} already exists`;
  }
}
