import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToMany,
    OneToMany,
} from 'typeorm'

import { User } from '../../users/user.entity'
import { CharacterSkinDraft } from './character-skin-draft.entity'
import { CharacterSkinImage } from './character-skin-image.entity'

@Entity()
export class CharacterSkin {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @Column({ default: false })
    enabled: boolean

    @Column({ default: false })
    showInShop: boolean

    @Column({ type: 'integer' })
    price: number

    @OneToMany(() => CharacterSkinImage, (characterSkinImage) => characterSkinImage.characterSkin, {
        eager: true,
        cascade: true,
    })
    images: CharacterSkinImage[]

    @ManyToMany(() => User, (user) => user.characterSkins)
    users: User[]

    @OneToMany(() => CharacterSkinDraft, (characterSkinDraft) => characterSkinDraft.skin)
    draft: CharacterSkinDraft[]

    @Column()
    @CreateDateColumn()
    createdAt: Date

    @Column()
    @UpdateDateColumn()
    updatedAt: Date
}
