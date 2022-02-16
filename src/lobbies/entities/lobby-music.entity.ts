import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'

import { Music } from '../../games/entity/music.entity'
import { Lobby } from './lobby.entity'

@Entity()
export class LobbyMusic {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ type: 'int' })
    position = 0

    @Column({ type: 'int' })
    startAt = 0

    @Column({ type: 'int' })
    endAt = 0

    @ManyToOne(() => Lobby, (lobby) => lobby.lobbyMusics, {
        onDelete: 'CASCADE',
    })
    lobby: Lobby

    @ManyToOne(() => Music, (music) => music.lobbyMusics, {
        onDelete: 'CASCADE',
    })
    music: Music

    @Column()
    @CreateDateColumn()
    createdAt: Date

    @Column()
    @UpdateDateColumn()
    updatedAt: Date
}
