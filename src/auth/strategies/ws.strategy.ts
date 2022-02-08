import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-jwt'
import { Socket } from 'socket.io'

import { UsersService } from '../../users/users.service'

@Injectable()
export class WsStrategy extends PassportStrategy(Strategy, 'ws') {
    constructor(private usersService: UsersService) {
        super({
            jwtFromRequest: (req: Socket): string | null => {
                const token = req.handshake.auth.token

                return typeof token === 'string' ? token : null
            },
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET,
        })
    }

    async validate(payload: { username: string }) {
        console.log(payload)
        return this.usersService.findByUsername(payload.username)
    }
}
