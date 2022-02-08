import {
    Body,
    CACHE_MANAGER,
    Controller,
    ForbiddenException,
    Get,
    Inject,
    NotFoundException,
    Param,
    Post,
    Put,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Cache } from 'cache-manager'
import { Request } from 'express'
import { Repository } from 'typeorm'

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { User } from '../users/user.entity'
import { LobbyCreateDto } from './dto/lobby-create.dto'
import { LobbySearchDto } from './dto/lobby-search.dto'
import { LobbyUser } from './entities/lobby-user.entity'
import { Lobby } from './entities/lobby.entity'
import { LobbyService } from './lobby.service'

@Controller('lobbies')
@UseGuards(JwtAuthGuard)
export class LobbyController {
    constructor(
        @InjectRepository(Lobby)
        private lobbyRepository: Repository<Lobby>,
        private lobbyService: LobbyService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {}

    @Get('')
    getAll(@Query() query: LobbySearchDto): Promise<Lobby[]> {
        return this.lobbyService.findByName(query.query)
    }

    @Post('/create')
    create(@Body() data: LobbyCreateDto): Promise<Lobby> {
        return this.lobbyService.create(data)
    }

    @Put(':code')
    async update(
        @Body() data: LobbyCreateDto,
        @Param('code') code: string,
        @Req() request: Request,
    ): Promise<void> {
        const lobby = await this.lobbyRepository.findOne({
            code,
        })
        if (lobby === undefined) {
            throw new NotFoundException()
        }

        const players: LobbyUser[] | undefined = await this.cacheManager.get(`${code}_players`)
        if (players === undefined) {
            throw new ForbiddenException()
        }
        if (
            players.find((player) => player.user.username === (<User>request.user).username) ===
            undefined
        ) {
            throw new ForbiddenException()
        }
        return this.lobbyService.update(lobby, data)
    }

    // @Get('/:code/join')
    // join(@Param('code') code: string): Promise<Lobby[]> {
    //     return this.lobbyRepository.findOne({
    //         code: code,
    //     })
    // }
}
