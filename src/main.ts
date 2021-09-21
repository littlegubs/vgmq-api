import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { useContainer } from 'class-validator'
import * as cookieParser from 'cookie-parser'

import { AppModule } from './app.module'
import { exceptionPipe } from './exception.pipe'

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule)
    app.useGlobalPipes(exceptionPipe)
    useContainer(app.select(AppModule), { fallbackOnErrors: true })
    app.use(cookieParser())
    app.enableCors({
        origin: /^https?:\/\/(localhost|127\.0\.0\.1|videogamemusicquiz.com)(:[0-9]+)?$/,
        credentials: true,
    })
    await app.listen(3000)
}

void bootstrap()
