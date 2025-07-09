import {
    DataSource,
    EntitySubscriberInterface,
    EventSubscriber,
    InsertEvent,
    ObjectLiteral,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm'

import { Lobby, LobbyDifficulties } from '../entities/lobby.entity'
import { LobbyListGateway } from '../lobby-list.gateway'
import { LobbyStatService } from '../services/lobby-stat.service'

@EventSubscriber()
export class LobbySubscriber implements EntitySubscriberInterface<Lobby> {
    constructor(
        connection: DataSource,
        private lobbyListGateway: LobbyListGateway,
        private lobbyStatService: LobbyStatService,
    ) {
        connection.subscribers.push(this)
    }

    listenTo(): typeof Lobby {
        return Lobby
    }

    beforeInsert(event: InsertEvent<Lobby>): void {
        this.updateDifficulty(event.entity)
    }

    async afterInsert(event: InsertEvent<Lobby>): Promise<void> {
        this.lobbyListGateway.sendLobbyList(
            await event.manager.find(Lobby, { relations: { lobbyUsers: true, lobbyMusics: true } }),
        )
    }

    beforeUpdate(event: UpdateEvent<Lobby>): void {
        this.updateDifficulty(event.entity)
    }

    async afterUpdate(event: UpdateEvent<Lobby>): Promise<void> {
        this.lobbyListGateway.sendLobbyList(
            await event.manager.find(Lobby, { relations: { lobbyUsers: true, lobbyMusics: true } }),
        )
    }

    async afterRemove(event: RemoveEvent<Lobby>): Promise<void> {
        if (event.entity) {
            await this.lobbyStatService.deleteLobbyStatsKeys(event.entity?.code)
        }
        this.lobbyListGateway.sendLobbyList(
            await event.manager.find(Lobby, { relations: { lobbyUsers: true, lobbyMusics: true } }),
        )
    }

    updateDifficulty(entity: ObjectLiteral | undefined): void {
        if (entity && entity.difficulty.length === 0) {
            entity.difficulty = [
                LobbyDifficulties.Easy,
                LobbyDifficulties.Medium,
                LobbyDifficulties.Hard,
            ]
        }
    }
}
