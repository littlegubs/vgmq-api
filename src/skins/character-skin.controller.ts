import { Controller, Get, Post, Req, UseGuards, HttpCode } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Request } from 'express'
import { Repository } from 'typeorm'

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { User } from '../users/user.entity'
import { CharacterSkinDraft } from './entities/character-skin-draft.entity'
import { CharacterSkin } from './entities/character-skin.entity'

@Controller('skins/character')
@UseGuards(JwtAuthGuard)
export class CharacterSkinController {
    constructor(
        @InjectRepository(CharacterSkin) private characterSkinRepository: Repository<CharacterSkin>,
        @InjectRepository(CharacterSkinDraft)
        private characterSkinDraftRepository: Repository<CharacterSkinDraft>,
    ) {}

    @Get('')
    async list(): Promise<CharacterSkin[]> {
        return this.characterSkinRepository.find({
            where: {
                enabled: true,
                showInShop: true,
            },
        })
    }

    @Post('create')
    @HttpCode(200)
    async updatePassword(@Req() request: Request): Promise<void> {
        const user = request.user as User

        await this.characterSkinDraftRepository.save(
            this.characterSkinDraftRepository.create({ artist: user }),
        )
    }
}
