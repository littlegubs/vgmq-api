import { UseFilters, UseGuards } from '@nestjs/common'
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { classToClass } from 'class-transformer'
import { Server, Socket } from 'socket.io'

import { WsNotFoundExceptionFilter } from '../auth/exception-filter/ws-not-found.exception-filter'
import { WsUnauthorizedExceptionFilter } from '../auth/exception-filter/ws-unauthorized.exception-filter'
import { WsGuard } from '../auth/guards/ws.guard'
import { User } from '../users/user.entity'
import { Lobby } from './entities/lobby.entity'

export class AuthenticatedSocket extends Socket {
    user: User
}

@UseFilters(WsUnauthorizedExceptionFilter, WsNotFoundExceptionFilter)
@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: '/list',
})
@UseGuards(WsGuard)
export class LobbyListGateway {
    @WebSocketServer()
    server: Server

    sendLobbyList(lobbies: Lobby[]): void {
        this.server.emit(
            'lobbyList',
            classToClass<Lobby>(lobbies, { groups: ['lobby'] }),
        )
    }
}