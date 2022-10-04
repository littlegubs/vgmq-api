import 'reflect-metadata'
import * as fs from 'fs'

import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { useContainer } from 'class-validator'
import * as cookieParser from 'cookie-parser'

import { AppModule } from './app.module'
import { exceptionPipe } from './exception.pipe'
import { RedisIoAdapter } from './redis-adapter'

async function bootstrap(): Promise<void> {
    let httpsOptions
    if (
        fs.existsSync('/etc/letsencrypt/live/api.videogamemusicquiz.com/privkey.pem') &&
        fs.existsSync('/etc/letsencrypt/live/api.videogamemusicquiz.com/fullchain.pem')
    ) {
        httpsOptions = {
            key: fs.readFileSync('/etc/letsencrypt/live/api.videogamemusicquiz.com/privkey.pem'),
            cert: fs.readFileSync('/etc/letsencrypt/live/api.videogamemusicquiz.com/fullchain.pem'),
        }
    }
    const app = await NestFactory.create(AppModule, { httpsOptions })
    const configService = app.get(ConfigService)
    const redisIoAdapter = new RedisIoAdapter(app, configService)
    await redisIoAdapter.connectToRedis()
    app.useWebSocketAdapter(redisIoAdapter)
    app.useGlobalPipes(exceptionPipe)
    useContainer(app.select(AppModule), { fallbackOnErrors: true })
    app.use(cookieParser())
    const cors = configService.get<string>('CORS_ALLOW_ORIGIN')
    if (cors === undefined) {
        throw new Error('CORS_ALLOW_ORIGIN not defined')
    }
    app.enableCors({
        origin: new RegExp(cors),
        credentials: true,
    })
    const port = configService.get<number>('PORT')
    if (port === undefined) {
        throw new Error('PORT not defined')
    }

    await app.listen(port)
}

void bootstrap()
