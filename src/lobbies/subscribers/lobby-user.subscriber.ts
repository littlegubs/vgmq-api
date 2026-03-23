import {
    DataSource,
    EntitySubscriberInterface,
    EventSubscriber,
    InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm'

import { LobbyUser, LobbyUserRole } from '../entities/lobby-user.entity'
import { Lobby } from '../entities/lobby.entity'
import { LobbyGateway } from '../lobby.gateway'
import { LobbyMusic } from '../entities/lobby-music.entity'

@EventSubscriber()
export class LobbyUserSubscriber implements EntitySubscriberInterface<LobbyUser> {
    constructor(
        connection: DataSource,
        private lobbyGateway: LobbyGateway,
    ) {
        connection.subscribers.push(this)
    }

    listenTo(): typeof LobbyUser {
        return LobbyUser
    }

    async beforeInsert(event: InsertEvent<LobbyUser>): Promise<void> {
        const lobbyUser = await event.manager.findOne(LobbyUser, {
            relations: { user: { patreonAccount: true }, lobby: true },
            where: {
                user: {
                    id: event.entity.user.id,
                },
            },
        })
        if (lobbyUser) {
            await event.manager.remove(LobbyUser, lobbyUser)
            await this.lobbyGateway.sendLobbyUsers(event.entity?.lobby)
        }

        if (event.entity.user.premium) {
            const lobby = await event.manager.findOne(Lobby, {
                where: { id: event.entity.lobby.id },
            })
            if (lobby !== null && lobby.premium === false) {
                await event.manager.update(Lobby, lobby.id, { premium: true })
                await this.lobbyGateway.sendUpdateToRoom(lobby.code)
                this.lobbyGateway.emitChat(
                    lobby.code,
                    null,
                    `Lobby premium features unlocked by ${event.entity.user.username}`,
                )
            }
        }
    }
}
