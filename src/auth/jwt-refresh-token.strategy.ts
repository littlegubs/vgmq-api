import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {Request} from "express";
import {AuthService} from "./auth.service";

@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh-token') {
    constructor(private authService: AuthService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([(request: Request) => {
                return request.body.refresh_token;
            }]),
            secretOrKey: process.env.JWT_REFRESH_TOKEN_SECRET,
            passReqToCallback: true
        });
    }

    async validate(request: Request, payload: { userId: number }) {
        console.log(request.body.refresh_token)
        const refreshToken = request.body.refresh_token
        return this.authService.getUserIfRefreshTokenMatches(refreshToken, payload.userId);
    }
}
