import slugify from 'slugify'
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    BeforeInsert,
    CreateDateColumn,
    UpdateDateColumn,
    BaseEntity,
    OneToMany,
    OneToOne,
    ManyToMany,
    JoinColumn,
} from 'typeorm'

import { User } from '../../users/user.entity'
import { AlternativeName } from './alternative-name.entity'
import { Cover } from './cover.entity'

@Entity()
export class Game {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ unique: true })
    igdbId: number

    @Column()
    firstReleaseDate: Date

    @Column()
    name: string

    @Column()
    slug: string

    @Column()
    url: string

    @Column({ default: true })
    enabled: boolean

    @OneToMany(() => AlternativeName, (alternativeName) => alternativeName.game, {
        cascade: ['insert', 'remove'],
    })
    alternativeNames: AlternativeName[]

    @OneToOne(() => Cover, (cover) => cover.game, {
        cascade: ['insert', 'remove'],
        onDelete: 'SET NULL',
    })
    @JoinColumn()
    cover?: Cover

    @ManyToMany(() => User, (user) => user.games)
    users: User[]

    @OneToOne(() => Game, (game) => game.children, {
        onDelete: 'SET NULL',
    })
    parent?: Game

    @OneToMany(() => Game, (game) => game.parent)
    children: Game[]

    @Column()
    @CreateDateColumn()
    createdAt: Date

    @Column()
    @UpdateDateColumn()
    updatedAt: Date

    @BeforeInsert() async slugifyName() {
        this.slug = slugify(this.name)
    }
}
