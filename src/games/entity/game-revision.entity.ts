// import {
//     Column,
//     PrimaryGeneratedColumn,
//     CreateDateColumn,
//     UpdateDateColumn,
//     ManyToOne,
//     OneToMany,
// } from 'typeorm'
//
// import { User } from '../../users/user.entity'
// import { GameRevisionAction } from './game-revision-action.entity'
// import { GameRevisionMessage } from './game-revision-message.entity'
// import { Game } from './game.entity'
//
// export enum GameRevisionStatuses {
//     Pending = 'pending',
//     Approved = 'approved',
//     Refused = 'refused',
// }
// // @Entity()
// export class GameRevision {
//     @PrimaryGeneratedColumn()
//     id: number
//
//     @Column({
//         type: 'set',
//         enum: GameRevisionStatuses,
//         default: GameRevisionStatuses.Pending,
//     })
//     status: string
//
//     @ManyToOne(() => Game, (game) => game.revisions, {
//         onDelete: 'SET NULL',
//         cascade: true,
//     })
//     game?: Game
//
//     @OneToMany(() => GameRevisionMessage, (message) => message.gameRevision)
//     messages: GameRevisionMessage[]
//
//     @OneToMany(() => GameRevisionAction, (message) => message.gameRevision)
//     actions: GameRevisionAction[]
//
//     @ManyToOne(() => User)
//     addedBy?: User
//
//     @ManyToOne(() => User)
//     validatedBy?: User
//
//     @Column()
//     @CreateDateColumn()
//     createdAt: Date
//
//     @Column()
//     @UpdateDateColumn()
//     updatedAt: Date
// }
