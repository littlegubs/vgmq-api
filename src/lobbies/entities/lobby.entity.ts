import * as bcrypt from 'bcrypt'
import { Exclude, Expose } from 'class-transformer'
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
    id: number

    @Column({ unique: true })
    code: string

    @Column()
    name: string

    @Column({ type: 'varchar', nullable: true })
    @Exclude()
    password: string | null

    @Column({
        type: 'enum',
        enum: LobbyStatuses,
        default: LobbyStatuses.Waiting,
    })
    status: string

    @Column({ type: 'int', default: 20 })
    guessTime: number

    @Column({ type: 'int', default: 20 })
    musicNumber: number

    @Column({ default: false })
    allowDuplicates: boolean

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

    @Expose()
    get hasPassword(): boolean {
        return this.password !== null
    }
}
