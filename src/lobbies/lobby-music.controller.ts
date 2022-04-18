import { createReadStream } from 'fs'

import {
    CACHE_MANAGER,
    Controller,
    Get,
    Inject,
    NotFoundException,
    Param,
    Req,
    Response,
    StreamableFile,
    UseGuards,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Cache } from 'cache-manager'
import { Request, Response as ExpressReponse } from 'express'
import { fileExistsSync } from 'tsconfig-paths/lib/filesystem'
import { Repository } from 'typeorm'

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { LobbyMusic } from './entities/lobby-music.entity'
import { LobbyService } from './lobby.service'

@Controller('lobby-music')
@UseGuards(JwtAuthGuard)
export class LobbyMusicController {
    constructor(
        @InjectRepository(LobbyMusic)
        private lobbyMusicRepository: Repository<LobbyMusic>,
        private lobbyService: LobbyService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {}

    @Get('/:id')
    async getAll(
        @Param('id') id: string,
        @Req() request: Request,
        @Response({ passthrough: true }) res: ExpressReponse,
    ): Promise<StreamableFile> {
        const lobbyMusic = await this.lobbyMusicRepository.findOne(id, {
            relations: ['music', 'lobby'],
        })
        if (lobbyMusic === undefined) {
            throw new NotFoundException()
        }

        if (!fileExistsSync(lobbyMusic.music.file.path)) {
            throw new NotFoundException()
        }
        const file = createReadStream(lobbyMusic.music.file.path, {
            start: lobbyMusic.startAt,
            end: lobbyMusic.endAt,
        })
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': lobbyMusic.endAt - lobbyMusic.startAt + 1,
            'Content-Range': `bytes ${lobbyMusic.startAt}-${lobbyMusic.endAt}/${lobbyMusic.endAt}`,
        })
        return new StreamableFile(file)
    }
}
