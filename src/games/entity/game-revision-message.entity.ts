// import { Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, Entity } from 'typeorm'
//
// import { User } from '../../users/user.entity'
// import { GameRevision } from './game-revision.entity'
//
// @Entity()
// export class GameRevisionMessage {
//     @PrimaryGeneratedColumn()
//     id: number
//
//     @Column({ type: 'varchar' })
//     message: string
//
//     @ManyToOne(() => User)
//     user?: User
//
//     @ManyToOne(() => GameRevision, (gameRevision) => gameRevision.messages, {
//         onDelete: 'SET NULL',
//         cascade: true,
//     })
//     gameRevision?: GameRevision
//
//     @Column()
//     @CreateDateColumn()
//     createdAt: Date
// }
