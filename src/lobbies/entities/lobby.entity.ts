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
    PlayingMusic = 'playing_music',
    AnswerReveal = 'answer_reveal',
    FinalStanding = 'final_standing',
}

@Entity()
export class Lobby {
    @PrimaryGeneratedColumn()
    @Exclude()
    id: number

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

    @Transform(({ value }) => value.length)
    @OneToMany(() => LobbyMusic, (lobbyMusic) => lobbyMusic.lobby)
    lobbyMusics: LobbyMusic[]

    @Column({ type: 'int', nullable: true })
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
