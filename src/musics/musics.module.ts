import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Music } from '../games/entity/music.entity'
import { MusicController } from './music.controller'
import { MusicSubscriber } from './subscribers/music.subscriber'

@Module({
    controllers: [MusicController],
    imports: [TypeOrmModule.forFeature([Music])],
    providers: [MusicSubscriber],
})
export class MusicsModule {}
