import {
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    Entity,
} from 'typeorm'

import { User } from '../../users/user.entity'
import { Game } from './game.entity'

export enum GameRevisionStatuses {
    Pending = 'pending',
    Approved = 'approved',
    Refused = 'refused',
}

@Entity()
export class GameRevision {
    @PrimaryGeneratedColumn()
    id: number

    @Column({
        type: 'set',
        enum: GameRevisionStatuses,
        default: GameRevisionStatuses.Pending,
    })
    status: string

    @ManyToOne(() => Game, (game) => game.revisions, {
        onDelete: 'SET NULL',
        cascade: true,
    })
    game?: Game

    // @OneToMany(() => GameRevisionMessage, (message) => message.gameRevision)
    // messages: GameRevisionMessage[]
    //
    // @OneToMany(() => GameRevisionAlbum, (message) => message.gameRevision)
    // albums: GameRevisionAlbum[]

    @ManyToOne(() => User)
    addedBy?: User

    @ManyToOne(() => User)
    validatedBy?: User

    @Column()
    @CreateDateColumn()
    createdAt: Date

    @Column()
    @UpdateDateColumn()
    updatedAt: Date
}
