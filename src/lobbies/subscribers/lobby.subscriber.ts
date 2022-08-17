import {
    DataSource,
    EntitySubscriberInterface,
    EventSubscriber,
    InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm'

import { Lobby } from '../entities/lobby.entity'
import { LobbyListGateway } from '../lobby-list.gateway'

@EventSubscriber()
export class LobbySubscriber implements EntitySubscriberInterface<Lobby> {
    constructor(connection: DataSource, private lobbyListGateway: LobbyListGateway) {
        connection.subscribers.push(this)
    }

    listenTo(): typeof Lobby {
        return Lobby
    }

    async afterInsert(event: InsertEvent<Lobby>): Promise<void> {
        this.lobbyListGateway.sendLobbyList(await event.manager.find(Lobby))
    }

    async afterUpdate(event: UpdateEvent<Lobby>): Promise<void> {
        this.lobbyListGateway.sendLobbyList(await event.manager.find(Lobby))
    }

    async afterRemove(event: RemoveEvent<Lobby>): Promise<void> {
        this.lobbyListGateway.sendLobbyList(await event.manager.find(Lobby))
    }
}
