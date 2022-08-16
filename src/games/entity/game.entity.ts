import { Expose } from 'class-transformer'
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    OneToOne,
    ManyToMany,
    JoinColumn,
    ManyToOne,
} from 'typeorm'

import { User } from '../../users/user.entity'
import { AlternativeName } from './alternative-name.entity'
import { Cover } from './cover.entity'
import { GameToMusic } from './game-to-music.entity'

@Entity()
export class Game {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ unique: true })
    igdbId: number

    @Column()
    category: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

    @Column({ type: 'date', nullable: true })
    firstReleaseDate: Date | null

    @Column()
    @Expose({ groups: ['lobby-answer-reveal', 'game-list'] })
    name: string

    @Column()
    slug: string

    @Column()
    url: string

    @Column({ default: true })
    enabled: boolean

    @OneToMany(() => AlternativeName, (alternativeName) => alternativeName.game, {
        cascade: true,
    })
    alternativeNames: AlternativeName[]

    @Expose({ groups: ['lobby-answer-reveal', 'game-list'] })
    @OneToOne(() => Cover, (cover) => cover.game, {
        cascade: true,
        onDelete: 'SET NULL',
        eager: true,
    })
    @JoinColumn()
    cover?: Cover | null

    @ManyToMany(() => User, (user) => user.games)
    users: User[]

    selectedByUser = false

    @ManyToOne(() => Game, (game) => game.children, {
        onDelete: 'SET NULL',
        cascade: true,
    })
    parent?: Game

    @OneToMany(() => Game, (game) => game.parent)
    children: Game[]

    @ManyToOne(() => Game, {
        onDelete: 'SET NULL',
        cascade: true,
    })
    versionParent?: Game

    @OneToMany(() => GameToMusic, (gameToMusic) => gameToMusic.game)
    musics: GameToMusic[]

    @Column()
    @CreateDateColumn()
    createdAt: Date

    @Column()
    @UpdateDateColumn()
    updatedAt: Date
}
