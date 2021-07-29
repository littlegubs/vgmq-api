import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import {BadRequestException, ValidationPipe} from "@nestjs/common";
import * as cookieParser from 'cookie-parser';
import {useContainer} from "class-validator";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    useContainer(app.select(AppModule), { fallbackOnErrors: true });
    app.useGlobalPipes(new ValidationPipe({
        exceptionFactory: errors => {
            return new BadRequestException(
                errors.map((error) => {
                    return {
                        property: error.property,
                        errors: Object.entries(error.constraints).map(([key, value]) => value)
                    }
                })
            )
        }
    }));
    app.use(cookieParser());
    app.enableCors({
        origin: /^https?:\/\/(localhost|127\.0\.0\.1|videogamemusicquiz.com)(:[0-9]+)?$/,
        credentials: true
    })
    await app.listen(3000);
}

bootstrap();
