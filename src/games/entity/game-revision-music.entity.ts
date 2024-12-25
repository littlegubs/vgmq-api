// import { OmitType } from '@nestjs/swagger'
// import { Column, ManyToOne, Entity, PrimaryGeneratedColumn } from 'typeorm'
//
// import { GameRevisionAlbum } from './game-revision-album.entity'
// import { GameRevision } from './game-revision.entity'
// import { GameToMusic } from './game-to-music.entity'
//
// @Entity()
// export class GameRevisionMusic extends OmitType(GameToMusic, [
//     'game',
//     'album',
//     'addedBy',
//     'originalGameToMusic',
//     'guessAccuracy',
//     'playNumber',
//     'musicAccuracies',
//     'lobbyMusics',
// ]) {
//     @PrimaryGeneratedColumn()
//     id: number
//
//     @Column({ type: 'int', nullable: true })
//     gameToMusicId: number | null
//
//     @ManyToOne(() => GameRevision, (gameRevision) => gameRevision.albums, {
//         onDelete: 'CASCADE',
//         cascade: true,
//     })
//     gameRevision: GameRevision
//
//     @ManyToOne(() => GameRevisionAlbum, (gameRevisionAlbum) => gameRevisionAlbum.musics)
//     album: GameRevisionAlbum
// }
