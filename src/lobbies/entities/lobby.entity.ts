import * as bcrypt from 'bcrypt'
import { Exclude, Expose, Transform } from 'class-transformer'
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    BeforeInsert,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm'

import { LobbyMusic } from './lobby-music.entity'
import { LobbyUser } from './lobby-user.entity'

export enum LobbyStatuses {
    Waiting = 'waiting',
    Loading = 'loading',
    Playing = 'playing',
    Buffering = 'buffering',
    PlayingMusic = 'playing_music',
    AnswerReveal = 'answer_reveal',
    FinalStanding = 'final_standing',
}

export enum LobbyDifficulties {
    Easy = 'easy',
    Medium = 'medium',
    Hard = 'hard',
}

export enum LobbyHintMode {
    Disabled = 'disabled',
    Allowed = 'allowed',
    Always = 'always',
}

export enum LobbyGameModes {
    Standard = 'standard',
    LocalCouch = 'local_couch',
}

@Entity()
export class Lobby {
    @PrimaryGeneratedColumn()
    @Exclude()
    id: number

    @Expose({ groups: ['lobby', 'lobby-list'] })
    @Column({ unique: true })
    code: string

    @Column()
    @Expose({ groups: ['lobby', 'lobby-list'] })
    name: string

    @Column({ type: 'varchar', nullable: true })
    @Expose({ groups: ['lobby'] })
    password: string | null

    @Column({
        type: 'enum',
        enum: LobbyStatuses,
        default: LobbyStatuses.Waiting,
    })
    @Expose({ groups: ['lobby', 'lobby-list'] })
    status: string

    @Column({ type: 'int', default: 20 })
    @Expose({ groups: ['lobby', 'lobby-list'] })
    guessTime: number

    @Column({ type: 'int', default: 20 })
    @Expose({ groups: ['lobby', 'lobby-list'] })
    musicNumber: number

    @Column({ default: false })
    @Expose({ groups: ['lobby', 'lobby-list'] })
    allowDuplicates: boolean

    @Column({ default: true })
    @Expose({ groups: ['lobby'] })
    playMusicOnAnswerReveal: boolean

    @Column({ type: 'boolean', default: false })
    @Expose({ groups: ['lobby', 'lobby-list'] })
    customDifficulty = false

    @Column({ type: 'int', default: 0 })
    @Expose({ groups: ['lobby', 'lobby-list'] })
    minDifficulty: number

    @Column({ type: 'int', default: 100 })
    @Expose({ groups: ['lobby', 'lobby-list'] })
    maxDifficulty: number

    @Column({ type: 'boolean', default: true })
    @Expose({ groups: ['lobby'] })
    allowContributeToMissingData = true

    @Column({
        type: 'set',
        enum: LobbyDifficulties,
        default: [LobbyDifficulties.Easy, LobbyDifficulties.Medium, LobbyDifficulties.Hard],
    })
    @Expose({ groups: ['lobby'] })
    difficulty: string[]

    @Column({
        type: 'enum',
        enum: LobbyGameModes,
        default: LobbyGameModes.Standard,
    })
    @Expose({ groups: ['lobby', 'lobby-list'] })
    gameMode: string

    @Column({
        type: 'enum',
        enum: LobbyHintMode,
        default: LobbyHintMode.Allowed,
    })
    @Expose({ groups: ['lobby', 'lobby-list'] })
    hintMode: LobbyHintMode

    @Transform(({ value }) => value?.length)
    @OneToMany(() => LobbyMusic, (lobbyMusic) => lobbyMusic.lobby)
    @Expose({ groups: ['lobby', 'lobby-list'] })
    lobbyMusics: LobbyMusic[]

    @Column({ type: 'int', nullable: true })
    @Expose({ groups: ['lobby', 'lobby-list'] })
    currentLobbyMusicPosition: number | null

    @OneToMany(() => LobbyUser, (lobbyUser) => lobbyUser.lobby)
    lobbyUsers: LobbyUser[]

    @Column()
    @CreateDateColumn()
    createdAt: Date

    @Column()
    @UpdateDateColumn()
    updatedAt: Date

    @BeforeInsert() async hashPassword(): Promise<void> {
        this.password = this.password ? await bcrypt.hash(this.password, 8) : null
    }

    @Expose({ groups: ['lobby', 'lobby-list'] })
    get hasPassword(): boolean {
        return this.password !== null
    }
}
