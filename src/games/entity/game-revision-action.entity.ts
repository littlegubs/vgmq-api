// import { Expose } from 'class-transformer'
// import {
//     Column,
//     PrimaryGeneratedColumn,
//     CreateDateColumn,
//     ManyToOne,
//     JoinColumn,
//     UpdateDateColumn,
//     OneToOne,
// } from 'typeorm'
//
// import { File } from '../../entity/file.entity'
// import { GameRevision } from './game-revision.entity'
// import { GameToMusic } from './game-to-music.entity'
// import { Game } from './game.entity'
//
// export enum GameRevisionActionType {
//     AddMusic = 'add_music',
//     EditMusic = 'edit_music',
//     RemoveMusic = 'remove_music',
//     AddLink = 'add_link',
// }
//
// // @Entity()
// export class GameRevisionAction {
//     @PrimaryGeneratedColumn()
//     id: number
//
//     @Column({
//         type: 'set',
//         enum: GameRevisionActionType,
//     })
//     type: string
//
//     @Column({ type: 'varchar', nullable: true })
//     @Expose({ groups: ['lobby-answer-reveal'] })
//     title: string | null
//
//     @Column({ type: 'varchar', nullable: true })
//     @Expose({ groups: ['lobby-answer-reveal'] })
//     artist: string | null
//
//     @ManyToOne(() => GameToMusic, {
//         onDelete: 'CASCADE',
//         eager: true,
//     })
//     @JoinColumn()
//     music?: GameToMusic | null
//
//     @OneToOne(() => File, { eager: true, cascade: true })
//     @JoinColumn()
//     file?: File
//
//     @ManyToOne(() => Game, {
//         onDelete: 'CASCADE',
//         eager: true,
//     })
//     @JoinColumn()
//     toLinkWith?: Game | null
//
//     @ManyToOne(() => GameRevision, (gameRevision) => gameRevision.actions, {
//         onDelete: 'CASCADE',
//         cascade: true,
//     })
//     gameRevision: GameRevision
//
//     @Column()
//     @CreateDateColumn()
//     createdAt: Date
//
//     @Column()
//     @UpdateDateColumn()
//     updatedAt: Date
// }
