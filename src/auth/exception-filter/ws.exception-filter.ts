import { ArgumentsHost, Catch, UnauthorizedException } from '@nestjs/common'
import { BaseWsExceptionFilter } from '@nestjs/websockets'
import { Socket } from 'socket.io'

@Catch(UnauthorizedException)
export class WsExceptionsFilter extends BaseWsExceptionFilter {
    catch(exception: UnauthorizedException, host: ArgumentsHost): void {
        super.catch(exception, host)

        const [socket] = host.getArgs<[Socket]>()
        socket.emit(exception.name, {
            status: 'error',
            message: exception.message,
        })
    }
}
