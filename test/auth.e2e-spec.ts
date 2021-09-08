import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import * as request from 'supertest'

import { AuthController } from '../src/auth/auth.controller'
import { AuthService } from '../src/auth/auth.service'
import { LimitedAccessGuard } from '../src/limited-access/guards/limited-access.guard'
import { User } from '../src/users/user.entity'
import { UsersService } from '../src/users/users.service'
import {UserExistsRule} from "../src/users/unique.validator";

describe('AuthController (e2e)', () => {
    let app: INestApplication
    // let userExistsRule: UserExistsRule
    const authService = { getUserTokens: () => ({ accessToken: 'test', refreshToken: 'yoyo' }) }
    const usersService = { create: (): { username: string } => ({ username: 'test' }) }
    const userExistsRule = { validate: (username: string) => username === 'userAlreadyExists' }
    const userRepository = { findOneOrFail: () => ['x'] }
    const limitedAccessGuard = {
        canActivate: (): boolean => true,
    }

    beforeAll(async () => {
        const moduleFixture = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                UsersService,
                {
                    provide: getRepositoryToken(User),
                    useValue: userRepository,
                },
                {
                    provide: AuthService,
                    useValue: authService,
                },
            ],
        })
            .overrideGuard(LimitedAccessGuard)
            .useValue(limitedAccessGuard)
            .compile()

        app = moduleFixture.createNestApplication()
        app.useGlobalPipes(new ValidationPipe())

        // userExistsRule = moduleFixture.get(UserExistsRule)

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
            // jest.spyOn(userExistsRule, 'validate').mockImplementation(() => Promise.resolve(true))
            return request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    email: 'yoyo@yoyo.fr',
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
