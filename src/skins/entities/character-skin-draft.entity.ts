import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    ManyToOne,
} from 'typeorm'

import { User } from '../../users/user.entity'
import { CharacterSkinImage } from './character-skin-image.entity'
import { CharacterSkin } from './character-skin.entity'

export enum CharacterSkinDraftStatus {
    Draft = 'draft',
    Pending = 'pending',
    Accepted = 'accepted',
    Rejected = 'rejected',
}

@Entity()
export class CharacterSkinDraft {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @Column({ type: 'integer' })
    price: number

    @Column({
        type: 'enum',
        enum: CharacterSkinDraftStatus,
        default: CharacterSkinDraftStatus.Draft,
    })
    type: string

    @OneToMany(
        () => CharacterSkinImage,
        (characterSkinImage) => characterSkinImage.characterSkinDraft,
        {
            eager: true,
            cascade: true,
        },
    )
    images: CharacterSkinImage[]

    @ManyToOne(() => User, (user) => user.games)
    artist: User // this is a User for now but I need to create an Artist class

    @ManyToOne(() => CharacterSkin, (characterSkin) => characterSkin.draft, { eager: true })
    skin: CharacterSkin

    @Column()
    @CreateDateColumn()
    createdAt: Date

    @Column()
    @UpdateDateColumn()
    updatedAt: Date
}
