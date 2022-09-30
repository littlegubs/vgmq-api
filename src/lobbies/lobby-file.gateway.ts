import { UseFilters, UseGuards } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { Server } from 'socket.io'

import { WsNotFoundExceptionFilter } from '../auth/exception-filter/ws-not-found.exception-filter'
import { WsUnauthorizedExceptionFilter } from '../auth/exception-filter/ws-unauthorized.exception-filter'
import { WsGuard } from '../auth/guards/ws.guard'

@UseFilters(WsUnauthorizedExceptionFilter, WsNotFoundExceptionFilter)
@WebSocketGateway(3001, {
    cors: {
        origin: '*',
    },
    namespace: '/file',
})
@UseGuards(WsGuard)
export class LobbyFileGateway {
    @WebSocketServer()
    server: Server

    constructor(private configService: ConfigService) {}

    sendBuffer(buffer: Buffer): void {
        this.server.emit('buffer', buffer)
    }
}
