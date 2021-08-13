import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Request } from 'express'
import { ExtractJwt, Strategy } from 'passport-jwt'

import { AuthService } from '../auth.service'

@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh-token') {
    constructor(private authService: AuthService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: Request) => {
                    return request.body.refresh_token
                },
            ]),
            secretOrKey: process.env.JWT_REFRESH_TOKEN_SECRET,
            passReqToCallback: true,
        })
    }

    async validate(request: Request, payload: { username: string }) {
        console.log(request.body.refresh_token)
        return this.authService.getUserIfRefreshTokenMatches(
            request.body.refresh_token,
            payload.username,
        )
    }
}
