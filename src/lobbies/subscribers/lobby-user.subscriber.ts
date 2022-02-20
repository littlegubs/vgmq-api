import { Connection, EntitySubscriberInterface, EventSubscriber, RemoveEvent } from 'typeorm'

import { LobbyUser, LobbyUserRole } from '../entities/lobby-user.entity'
import { Lobby } from '../entities/lobby.entity'
import { LobbyGateway } from '../events/lobby.gateway'

@EventSubscriber()
export class LobbyUserSubscriber implements EntitySubscriberInterface<LobbyUser> {
    constructor(connection: Connection, private lobbyGateway: LobbyGateway) {
        connection.subscribers.push(this)
    }

    listenTo(): typeof LobbyUser {
        return LobbyUser
    }

    async afterRemove(event: RemoveEvent<LobbyUser>): Promise<void> {
        if (event.entity?.role === LobbyUserRole.Host) {
            const randomPlayer = await event.manager
                .createQueryBuilder(LobbyUser, 'lobbyUser')
                .andWhere('lobbyUser.lobby = :lobby')
                .andWhere('lobbyUser.role = :role')
                .andWhere('lobbyUser.disconnected = 0')
                .setParameter('lobby', event.entity.lobby)
                .setParameter('role', LobbyUserRole.Player)
                .orderBy('RAND()')
                .getOne()
            if (randomPlayer) {
                await event.manager.save(LobbyUser, { ...randomPlayer, role: LobbyUserRole.Host })
            } else {
                await event.manager.remove(Lobby, event.entity.lobby)
                this.lobbyGateway.sendLobbyClosed(event.entity.lobby, 'The host left the lobby!')
            }
        }
    }
}
