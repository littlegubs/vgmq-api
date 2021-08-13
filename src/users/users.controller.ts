import { Controller, Get, Param } from '@nestjs/common'

import { UsersService } from './users.service'

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get(':id')
    show(@Param('id') id: string) {
        return this.usersService.showById(parseInt(id, 10))
    }
}
