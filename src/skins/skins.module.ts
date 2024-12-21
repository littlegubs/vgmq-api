import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { User } from '../users/user.entity'
import { CharacterSkinController } from './character-skin.controller'
import { CharacterSkinDraft } from './entities/character-skin-draft.entity'
import { CharacterSkinImage } from './entities/character-skin-image.entity'
import { CharacterSkin } from './entities/character-skin.entity'

@Module({
    controllers: [CharacterSkinController],
    imports: [
        TypeOrmModule.forFeature([User, CharacterSkin, CharacterSkinImage, CharacterSkinDraft]),
    ],
    exports: [TypeOrmModule],
})
export class SkinsModule {}
