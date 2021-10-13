import {
    Body,
    Controller,
    Delete,
    NotFoundException,
    Param,
    Patch,
    UseGuards,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Music } from '../games/entity/music.entity'
import { Role } from '../users/role.enum'
import { Roles } from '../users/roles.decorator'
import { RolesGuard } from '../users/roles.guard'
import { MusicEditDto } from './dto/music-edit.dto'

@Controller('musics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MusicController {
    constructor(
        @InjectRepository(Music)
        private musicRepository: Repository<Music>,
    ) {}

    @Roles(Role.Admin)
    @Patch('/:id')
    async edit(@Param('id') id: string, @Body() musicEditDto: MusicEditDto): Promise<Music> {
        const music = await this.musicRepository.findOne(id)
        if (!music) {
            throw new NotFoundException()
        }
        return this.musicRepository.save({
            ...music,
            title: musicEditDto.title,
            artist: musicEditDto.artist,
        })
    }

    @Roles(Role.Admin)
    @Delete('/:id')
    async delete(@Param('id') id: string): Promise<Music> {
        const music = await this.musicRepository.findOne(id)
        if (!music) {
            throw new NotFoundException()
        }
        return this.musicRepository.remove(music)
    }
}
