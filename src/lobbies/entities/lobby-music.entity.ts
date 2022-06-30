import { Expose } from 'class-transformer'
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinTable,
    ManyToMany,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'

import { GameToMusic } from '../../games/entity/game-to-music.entity'
import { Game } from '../../games/entity/game.entity'
import { Lobby } from './lobby.entity'

@Entity()
export class LobbyMusic {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ type: 'int' })
    position = 0

    @Column({ type: 'float' })
    startAt = 0

    @Column({ type: 'float' })
    endAt = 0

    @ManyToOne(() => Lobby, (lobby) => lobby.lobbyMusics, {
        orphanedRowAction: 'delete',
        onDelete: 'CASCADE',
    })
    lobby: Lobby

    @ManyToOne(() => GameToMusic, (gameToMusic) => gameToMusic.lobbyMusics, {
        onDelete: 'CASCADE',
    })
    @Expose({ groups: ['lobby-answer-reveal'] })
    gameToMusic: GameToMusic

    @ManyToMany(() => Game, { onDelete: 'CASCADE' })
    @JoinTable()
    expectedAnswers: Game[]

    @Column()
    @CreateDateColumn()
    createdAt: Date

    @Column()
    @UpdateDateColumn()
    updatedAt: Date
}
