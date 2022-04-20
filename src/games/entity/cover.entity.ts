import { Expose } from 'class-transformer'
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
} from 'typeorm'

import { Game } from './game.entity'

@Entity()
export class Cover {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ unique: true })
    igdbId: number

    @Column()
    @Expose({ groups: ['lobby-answer-reveal', 'game-list'] })
    imageId: string

    @OneToOne(() => Game, (game) => game.cover, { onDelete: 'CASCADE' })
    game: Game

    @Column()
    @CreateDateColumn()
    createdAt: Date

    @Column()
    @UpdateDateColumn()
    updatedAt: Date
}
