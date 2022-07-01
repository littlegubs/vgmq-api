import { ArgumentsHost, Catch, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { BaseWsExceptionFilter } from '@nestjs/websockets'
import { Repository } from 'typeorm'

import { LobbyUser } from '../../lobbies/entities/lobby-user.entity'
import { AuthenticatedSocket } from '../../lobbies/lobby.gateway'

@Catch(NotFoundException)
export class WsNotFoundExceptionFilter extends BaseWsExceptionFilter {
    constructor(
        @InjectRepository(LobbyUser)
        private lobbyUserRepository: Repository<LobbyUser>,
    ) {
        super()
    }

    catch(exception: NotFoundException, host: ArgumentsHost): void {
        super.catch(exception, host)

        const [socket] = host.getArgs<[AuthenticatedSocket]>()

        socket.emit(exception.name, {
            status: 'error',
            message: exception.message,
        })
    }
}
