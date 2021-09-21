import { INestApplication } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { useContainer } from 'class-validator'
import * as cookieParser from 'cookie-parser'
import * as request from 'supertest'

import { exceptionPipe } from '../src/exception.pipe'
import { LimitedAccessController } from '../src/limited-access/limited-access.controller'
import { LimitedAccessValidator } from '../src/limited-access/limited-access.validator'

describe('LimitedAccessController (e2e)', () => {
    let app: INestApplication
    let configService: ConfigService

    beforeAll(async () => {
        const moduleFixture = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    envFilePath: ['.env.local', '.env'],
                }),
            ],
            controllers: [LimitedAccessController],
            providers: [ConfigService, LimitedAccessValidator],
        }).compile()

        app = moduleFixture.createNestApplication()
        useContainer(app, { fallbackOnErrors: true })
        app.use(cookieParser())
        app.useGlobalPipes(exceptionPipe)

        configService = moduleFixture.get(ConfigService)

        await app.init()
    })
    describe('(GET) allowed', () => {
        it('should return 200: false', async () => {
            return request(app.getHttpServer()).get('/limited-access/allowed').expect(200, 'false')
        })
        it('should return 200: true', () => {
            return request(app.getHttpServer())
                .get('/limited-access/allowed')
                .set('Cookie', 'pote=pote')
                .expect(200, 'true')
        })
    })

    describe('(POST) password', () => {
        it('should return 400: missing password', async () => {
            return request(app.getHttpServer())
                .post('/limited-access/password')
                .expect(400, {
                    error: 'Bad Request',
                    message: [
                        {
                            errors: ['invalid password'],
                            property: 'password',
                        },
                    ],
                    statusCode: 400,
                })
        })
        it('should return 400: wrong password', async () => {
            return request(app.getHttpServer())
                .post('/limited-access/password')
                .send({ password: 'yoyo' })
                .expect(400, {
                    error: 'Bad Request',
                    message: [
                        {
                            errors: ['invalid password'],
                            property: 'password',
                        },
                    ],
                    statusCode: 400,
                })
        })
        it('should return 200', async () => {
            return request(app.getHttpServer())
                .post('/limited-access/password')
                .send({ password: configService.get('LIMITED_ACCESS_PASSWORD') })
                .expect(200, {})
                .expect('set-cookie', new RegExp(/^pote=pote;/))
        })
    })

    afterAll(async () => {
        await app.close()
    })
})
