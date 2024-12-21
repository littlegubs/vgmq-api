import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
    ManyToOne,
} from 'typeorm'

import { File } from '../../entity/file.entity'
import { CharacterSkinDraft } from './character-skin-draft.entity'
import { CharacterSkin } from './character-skin.entity'

export enum CharacterSkinImageType {
    Idle = 'idle',
    Typing = 'typing',
    CorrectAnswer = 'correct_answer',
    WrongAnswer = 'wrong_answer',
    WrongGuess = 'wrong_guess',
    Hint = 'hint',
}

@Entity()
export class CharacterSkinImage {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @Column({
        type: 'enum',
        enum: CharacterSkinImageType,
        default: CharacterSkinImageType.Idle,
    })
    type: string

    @OneToOne(() => File, { eager: true, cascade: true })
    @JoinColumn()
    file: File

    @ManyToOne(() => CharacterSkin, (characterSkin) => characterSkin.images)
    characterSkin: CharacterSkin

    @ManyToOne(() => CharacterSkinDraft, (characterSkinDraft) => characterSkinDraft.images)
    characterSkinDraft: CharacterSkinDraft

    @Column()
    @CreateDateColumn()
    createdAt: Date

    @Column()
    @UpdateDateColumn()
    updatedAt: Date
}
