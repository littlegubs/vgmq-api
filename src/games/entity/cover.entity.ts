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
    imageId: string

    @OneToOne(() => Game, (game) => game.cover, { onUpdate: 'CASCADE' })
    game: Game

    @Column()
    @CreateDateColumn()
    createdAt: Date

    @Column()
    @UpdateDateColumn()
    updatedAt: Date
}
