import 'reflect-metadata'

import { NestFactory } from '@nestjs/core'
import { DataSource } from 'typeorm'

import { AppModule } from './app.module'
import { GameToMusic } from './games/entity/game-to-music.entity'

async function bootstrap(): Promise<void> {
    const app = await NestFactory.createApplicationContext(AppModule)

    const dataSource = app.get(DataSource) // Retrieve the DataSource
    const gameToMusicRepository = dataSource.getRepository(GameToMusic)

    const gametoMusics = await gameToMusicRepository.find()
    let i = 1
    for (const gametoMusic of gametoMusics) {
        try {
            await gameToMusicRepository.save({
                ...gametoMusic,
                title: gametoMusic.title ?? gametoMusic.music.title,
                artist: gametoMusic.artist ?? gametoMusic.music.artist,
                disk: gametoMusic.disk ?? gametoMusic.music.disk,
                track: gametoMusic.track ?? gametoMusic.music.track,
            })
            console.log(
                `${i}/${gametoMusics.length} updated ${gametoMusic.title} - ${gametoMusic.artist}`,
            )
            i++
        } catch (error) {
            console.error(error)
        }
    }

    await app.close()
}

void bootstrap()
