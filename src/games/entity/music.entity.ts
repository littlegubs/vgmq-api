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
import { LobbyMusic } from '../../lobbies/entities/lobby-music.entity'
import { GameToMusic } from './game-to-music.entity'
import {Expose} from "class-transformer";

@Entity()
export class Music {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    @Expose({ groups: ['lobby-answer-reveal'] })
    title: string

    @Column({ nullable: true })
    @Expose({ groups: ['lobby-answer-reveal'] })
    artist: string

    @Column({ type: 'float' })
    duration: number

    @OneToMany(() => GameToMusic, (gameToMusic) => gameToMusic.music)
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
