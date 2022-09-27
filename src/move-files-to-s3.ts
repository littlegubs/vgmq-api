import 'reflect-metadata'

import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module'
import { MusicService } from './musics/music.service'
import { MusicsModule } from './musics/musics.module'

async function bootstrap(): Promise<void> {
    const app = await NestFactory.createApplicationContext(AppModule)

    const gameService = app.select(MusicsModule).get(MusicService, { strict: true })

    try {
        await gameService.moveFilesToS3()
    } catch (error) {
        console.error(error)
    }
    await app.close()
}

void bootstrap()
