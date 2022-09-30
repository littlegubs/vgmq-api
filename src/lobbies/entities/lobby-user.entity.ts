import { Expose } from 'class-transformer'
import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'

import { User } from '../../users/user.entity'
import { Lobby } from './lobby.entity'

export enum LobbyUserRole {
    Host = 'host',
    Player = 'player',
    Spectator = 'spectator',
}

export enum LobbyUserStatus {
    Buffering = 'buffering',
    ReadyToPlayMusic = 'ready_to_play_music',
}

@Entity()
export class LobbyUser {
    @PrimaryGeneratedColumn()
    id: number

    @Column({
        type: 'enum',
        enum: LobbyUserRole,
        default: LobbyUserRole.Player,
    })
    @Expose({ groups: ['wsLobby'] })
    role: string

    @Column({ type: 'int', default: 0 })
    @Expose({ groups: ['wsLobby'] })
    points: number

    @Column({ type: 'boolean', default: false })
    @Expose({ groups: ['wsLobby'] })
    disconnected: boolean

    @Column({ type: 'boolean', default: false })
    toDisconnect: boolean

    @Column({ type: 'boolean', default: false })
    isReconnecting: boolean

    @Column({ nullable: true, type: 'enum', enum: LobbyUserStatus })
    @Expose({ groups: ['wsLobby'] })
    status: string | null

    @Column({ nullable: true })
    answer?: string

    @Column({ type: 'boolean', nullable: true })
    @Expose({ groups: ['wsLobby'] })
    correctAnswer: boolean | null

    @OneToOne(() => User, (user) => user.currentLobby, { onDelete: 'CASCADE' })
    @Expose({ groups: ['wsLobby'] })
    user: User

    @ManyToOne(() => Lobby, (lobby) => lobby.lobbyUsers, {
        onDelete: 'CASCADE',
        eager: true,
    })
    lobby: Lobby

    @Column()
    @CreateDateColumn()
    createdAt: Date

    @Column()
    @UpdateDateColumn()
    updatedAt: Date
}
