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
import { Role } from '../users/role.enum'
import { Roles } from '../users/roles.decorator'
import { RolesGuard } from '../users/roles.guard'
import { User } from '../users/user.entity'
import { LobbyCreateDto } from './dto/lobby-create.dto'
import { LobbySearchDto } from './dto/lobby-search.dto'
import { LobbyUser, LobbyUserRole } from './entities/lobby-user.entity'
import { Lobby } from './entities/lobby.entity'
import { LobbyGateway } from './lobby.gateway'
import { LobbyService } from './services/lobby.service'
import dayjs from 'dayjs'

@Controller('lobbies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LobbyController {
    constructor(
        @InjectRepository(Lobby) private lobbyRepository: Repository<Lobby>,
        private lobbyService: LobbyService,
        @InjectRepository(LobbyUser) private lobbyUserRepository: Repository<LobbyUser>,
        @InjectRepository(Game) private gameRepository: Repository<Game>,
        private lobbyGateway: LobbyGateway,
    ) {}

    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ groups: ['lobby-list'] })
    @Get('')
    getAll(@Query() query: LobbySearchDto): Promise<Lobby[]> {
        console.log(dayjs().unix())
        return this.lobbyService.findByName(query.query)
    }

    @Get('info')
    async getGlobalInformation(@Req() request: Request): Promise<{
        userIsPremium: boolean
        filterMaxYear: number
        filterMinYear: number
        musicAccuracyRatio: number
    }> {
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
            userIsPremium: (<User>request.user).premium,
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

    @Roles(Role.SuperAdmin)
    @Post('sendMessageToLobbies')
    async sendMessageToLobbies(@Body() data: { message: string }): Promise<void> {
        const lobbies = await this.lobbyRepository.find()

        for (const lobby of lobbies) {
            this.lobbyGateway.emitChat(lobby.code, null, data.message)
        }
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
