import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm'

import { File } from '../../entity/file.entity'
import { GameToMusic } from './game-to-music.entity'

@Entity()
export class Music {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    title: string

    @Column({ nullable: true })
    artist: string

    @Column({ type: 'float' })
    duration: number

    @Column({ type: 'float', nullable: true })
    guessAccuracy: number

    @Column({ type: 'integer', default: 0 })
    playNumber = 0

    @OneToMany(() => GameToMusic, (gameToMusic) => gameToMusic.music, {
        cascade: ['remove'],
    })
    games: GameToMusic[]

    @OneToOne(() => File, { eager: true, cascade: true })
    @JoinColumn()
    file: File

    @Column()
    @CreateDateColumn()
    createdAt: Date

    @Column()
    @UpdateDateColumn()
    updatedAt: Date
}
