import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    BaseEntity,
    OneToOne,
} from 'typeorm'

import { Game } from './game.entity'

@Entity()
export class Cover extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ unique: true })
    igdbId: string

    @Column()
    imageId: string

    @Column()
    height: number

    @Column()
    width: number

    @OneToOne(() => Game, (game) => game.cover)
    game: Game

    @Column()
    @CreateDateColumn()
    createdAt: Date

    @Column()
    @UpdateDateColumn()
    updatedAt: Date
}
