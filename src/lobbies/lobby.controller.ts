import {
    Body,
    ClassSerializerInterceptor,
    Controller,
    ForbiddenException,
    Get,
    NotFoundException,
    Param,
    Post,
    Put,
    Query,
    Req,
    SerializeOptions,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Request } from 'express'
import { Repository } from 'typeorm'

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Game } from '../games/entity/game.entity'
import { User } from '../users/user.entity'
import { LobbyCreateDto } from './dto/lobby-create.dto'
import { LobbySearchDto } from './dto/lobby-search.dto'
import { LobbyUser, LobbyUserRole } from './entities/lobby-user.entity'
import { Lobby } from './entities/lobby.entity'
import { LobbyService } from './services/lobby.service'

@Controller('lobbies')
@UseGuards(JwtAuthGuard)
export class LobbyController {
    constructor(
        @InjectRepository(Lobby) private lobbyRepository: Repository<Lobby>,
        private lobbyService: LobbyService,
        @InjectRepository(LobbyUser) private lobbyUserRepository: Repository<LobbyUser>,
        @InjectRepository(Game) private gameRepository: Repository<Game>,
    ) {}

    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ groups: ['lobby-list'] })
    @Get('')
    getAll(@Query() query: LobbySearchDto): Promise<Lobby[]> {
        return this.lobbyService.findByName(query.query)
    }

    @Get('info')
    async getGlobalInformation(
        @Req() request: Request,
    ): Promise<{ filterMaxYear: number; filterMinYear: number; musicAccuracyRatio: number }> {
        const lobbyUser = await this.lobbyUserRepository.findOne({
            relations: {
                user: true,
                lobby: true,
            },
            where: {
                user: {
                    id: (<User>request.user).id,
                },
            },
        })
        const filterYear = await this.gameRepository
            .createQueryBuilder('g')
            .select('MIN(YEAR(g.firstReleaseDate))', 'filterMinYear')
            .addSelect('MAX(YEAR(g.firstReleaseDate))', 'filterMaxYear')
            .getRawOne<{ filterMinYear: string; filterMaxYear: string }>()

        return {
            filterMaxYear: Number(filterYear!.filterMaxYear),
            filterMinYear: Number(filterYear!.filterMinYear),
            musicAccuracyRatio:
                1 - (await this.lobbyService.getMusicAccuracyRatio(lobbyUser?.lobby)),
        }
    }

    @Post('/create')
    create(@Body() data: LobbyCreateDto, @Req() request: Request): Promise<Lobby> {
        return this.lobbyService.create(data, request.user as User)
    }

    @Put(':code')
    async update(
        @Body() data: LobbyCreateDto,
        @Param('code') code: string,
        @Req() request: Request,
    ): Promise<void> {
        const lobby = await this.lobbyRepository.findOneBy({
            code,
        })
        if (lobby === null) {
            throw new NotFoundException()
        }

        const player = await this.lobbyUserRepository.findOne({
            relations: ['user'],
            where: {
                user: {
                    id: (<User>request.user).id,
                },
                role: LobbyUserRole.Host,
            },
        })
        if (player === null) {
            throw new ForbiddenException()
        }
        return this.lobbyService.update(lobby, data, request.user as User)
    }
}
