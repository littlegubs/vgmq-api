// import { OmitType } from '@nestjs/swagger'
// import { Column, ManyToOne, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm'
//
// import { GameAlbum } from './game-album.entity'
// import { GameRevisionMusic } from './game-revision-music.entity'
// import { GameRevision } from './game-revision.entity'
//
// @Entity()
// export class GameRevisionAlbum extends OmitType(GameAlbum, [
//     'game',
//     'validatedBy',
//     'createdBy',
//     'musics',
//     'cover',
// ]) {
//     @PrimaryGeneratedColumn()
//     id: number
//
//     @Column({ type: 'int', nullable: true })
//     albumId: number | null
//
//     @ManyToOne(() => GameRevision, (gameRevision) => gameRevision.albums, {
//         onDelete: 'CASCADE',
//         cascade: true,
//     })
//     gameRevision: GameRevision
//
//     @OneToMany(() => GameRevisionMusic, (gameToMusic) => gameToMusic.album)
//     musics: GameRevisionMusic[]
// }
