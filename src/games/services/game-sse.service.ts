import { Injectable, MessageEvent } from '@nestjs/common'
import { Observable, Subject } from 'rxjs'

@Injectable()
export class GameSseService {
    private events = new Subject<MessageEvent>()

    addEvent(event: MessageEvent): void {
        this.events.next(event)
    }

    sendEvents(): Observable<MessageEvent> {
        return this.events.asObservable()
    }
}
