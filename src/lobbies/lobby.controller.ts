import {
    BadRequestException,
    Body,
    ClassSerializerInterceptor,
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
    SerializeOptions,
    StreamableFile,
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
import path from 'node:path'
import { LobbyMusic } from './entities/lobby-music.entity'
import { PRIVATE_STORAGE } from '../storage/storage.constants'
import { StorageService } from '../storage/storage.interface'
import { ModerationService } from '../utils/moderation.service'

@Controller('lobbies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LobbyController {
    constructor(
        @InjectRepository(Lobby) private lobbyRepository: Repository<Lobby>,
        private lobbyService: LobbyService,
        @InjectRepository(LobbyUser) private lobbyUserRepository: Repository<LobbyUser>,
        @InjectRepository(Game) private gameRepository: Repository<Game>,
        @InjectRepository(LobbyMusic) private lobbyMusicRepository: Repository<LobbyMusic>,
        private lobbyGateway: LobbyGateway,
        @Inject(PRIVATE_STORAGE) private privateStorageService: StorageService,
        private moderationService: ModerationService,
    ) {}

    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ groups: ['lobby-list'] })
    @Get('')
    getAll(@Query() query: LobbySearchDto): Promise<Lobby[]> {
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
    async create(@Body() data: LobbyCreateDto, @Req() request: Request): Promise<Lobby> {
        const isToxic = await this.moderationService.isToxic(data.name)
        if (isToxic) {
            throw new BadRequestException('HARMFUL_LOBBY_NAME')
        }
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

    @Get('/music/current')
    async getCurrentRoundMusic(@Req() request: Request): Promise<StreamableFile> {
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
        if (lobbyUser === null) {
            throw new ForbiddenException()
        }
        const lobbyMusic = await this.lobbyMusicRepository.findOne({
            relations: { lobby: true },
            where: {
                lobby: { id: lobbyUser.lobby.id },
                loaded: true,
            },
            order: {
                id: 'DESC',
            },
        })
        if (!lobbyMusic) {
            throw new NotFoundException()
        }
        const clipFilename = `lobby-${lobbyUser.lobby.code}-round-${lobbyMusic.position}.mp3`
        const clipPath = path.join('clips', clipFilename)
        const buffer = await this.privateStorageService.getObject(clipPath)

        return new StreamableFile(buffer)
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

        const isToxic = await this.moderationService.isToxic(data.name)
        if (isToxic) {
            throw new BadRequestException('HARMFUL_LOBBY_NAME')
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
        return this.lobbyService.update(lobby, data)
    }
}
