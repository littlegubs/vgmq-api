import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { UserExistsRule } from '../users/unique.validator'
import { User } from '../users/user.entity'

@Module({
    imports: [TypeOrmModule.forFeature([User])],
    providers: [UserExistsRule],
})
export class ValidatorModule {}
