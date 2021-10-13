import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
} from 'typeorm'

import { Game } from './game.entity'
import { Music } from './music.entity'

@Entity()
export class GameToMusic {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => Game, (game) => game.musics)
    game: Game

    @ManyToOne(() => Music, (music) => music.games, {
        cascade: ['insert', 'update'],
        onDelete: 'CASCADE',
        eager: true,
    })
    music: Music

    @Column()
    @CreateDateColumn()
    createdAt: Date

    @Column()
    @UpdateDateColumn()
    updatedAt: Date
}
