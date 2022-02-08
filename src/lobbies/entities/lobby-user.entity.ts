import { Expose } from 'class-transformer'
import { DeepPartial } from 'typeorm/browser'

import { User } from '../../users/user.entity'

export enum LobbyUserRole {
    Host = 'host',
    Player = 'player',
    Spectator = 'spectator',
}

export class LobbyUser {
    @Expose({ groups: ['wsLobby'] })
    user: User
    @Expose({ groups: ['wsLobby'] })
    role = LobbyUserRole.Player
    @Expose({ groups: ['wsLobby'] })
    points = 0
    @Expose({ groups: ['wsLobby'] })
    disconnected = false
    @Expose({ groups: ['wsLobby'] })
    status: string

    constructor(xd: DeepPartial<LobbyUser>) {
        Object.assign(this, xd)
    }
}
