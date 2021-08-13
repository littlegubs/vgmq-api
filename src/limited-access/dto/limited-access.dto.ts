import { Validate } from 'class-validator'

import { LimitedAccessValidator } from '../limited-access.validator'
export class LimitedAccessDto {
    @Validate(LimitedAccessValidator)
    password: string
}
