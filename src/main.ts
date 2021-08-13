import 'reflect-metadata'
import { BadRequestException, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { useContainer } from 'class-validator'
import * as cookieParser from 'cookie-parser'

import { AppModule } from './app.module'

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule)
    useContainer(app.select(AppModule), { fallbackOnErrors: true })
    app.useGlobalPipes(
        new ValidationPipe({
            exceptionFactory: (errors): BadRequestException => {
                return new BadRequestException(
                    errors.map((error) => {
                        return {
                            property: error.property,
                            errors: Object.values(error.constraints ?? []),
                        }
                    }),
                )
            },
        }),
    )
    app.use(cookieParser())
    app.enableCors({
        origin: /^https?:\/\/(localhost|127\.0\.0\.1|videogamemusicquiz.com)(:[0-9]+)?$/,
        credentials: true,
    })
    await app.listen(3000)
}

void bootstrap()
