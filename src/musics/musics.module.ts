import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Music } from '../games/entity/music.entity'
import { MusicSubscriber } from './subscribers/music.subscriber'

@Module({
    imports: [TypeOrmModule.forFeature([Music])],
    providers: [MusicSubscriber],
})
export class MusicsModule {}
