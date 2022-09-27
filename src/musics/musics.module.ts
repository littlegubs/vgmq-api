import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { File } from '../entity/file.entity'
import { Music } from '../games/entity/music.entity'
import { S3Service } from '../s3/s3.service'
import { MusicService } from './music.service'
import { MusicSubscriber } from './subscribers/music.subscriber'

@Module({
    imports: [TypeOrmModule.forFeature([Music, File])],
    providers: [MusicSubscriber, MusicService, S3Service],
})
export class MusicsModule {}
