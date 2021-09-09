import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { useContainer } from 'class-validator'
import * as request from 'supertest'

import { AuthController } from '../src/auth/auth.controller'
import { AuthService } from '../src/auth/auth.service'
import { LimitedAccessGuard } from '../src/limited-access/guards/limited-access.guard'
import { UserExistsRule } from '../src/users/unique.validator'
import { UsersService } from '../src/users/users.service'

describe('AuthController (e2e)', () => {
    let app: INestApplication
    let userExistsRule: UserExistsRule

    beforeAll(async () => {
        const moduleFixture = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: UsersService,
                    useValue: { create: (): { username: string } => ({ username: 'test' }) },
                },
                {
                    provide: AuthService,
                    useValue: {
                        getUserTokens: () => ({ accessToken: 'test', refreshToken: 'yoyo' }),
                    },
                },
                {
                    provide: UserExistsRule,
                    useValue: {
                        validate: async (value: string): Promise<boolean> => Promise.resolve(true),
                    },
                },
            ],
        })
            .overrideGuard(LimitedAccessGuard)
            .useValue({
                canActivate: (): boolean => true,
            })
            .compile()

        app = moduleFixture.createNestApplication()
        useContainer(app, { fallbackOnErrors: true })
        app.useGlobalPipes(new ValidationPipe())

        userExistsRule = moduleFixture.get(UserExistsRule)

        await app.init()
    })

    describe('register', () => {
        it('should return 400 with missing field', () => {
            return request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    email: 'yoyo',
                })
                .expect(400)
        })
        it('should return 400 if user already exists', () => {
            jest.spyOn(userExistsRule, 'validate').mockImplementation(() => Promise.resolve(false))
            return request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    email: 'email@exists.com',
                    username: 'alreadyExists',
                    password: 'xd',
                })
                .expect(400)
        })
    })

    afterAll(async () => {
        await app.close()
    })
})
