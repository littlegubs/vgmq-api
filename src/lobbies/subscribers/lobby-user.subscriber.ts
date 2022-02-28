import {
    Connection,
    EntitySubscriberInterface,
    EventSubscriber,
    InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm'

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

    async beforeInsert(event: InsertEvent<LobbyUser>): Promise<void> {
        const lobbyUser = await event.manager.findOne(LobbyUser, {
            relations: ['user', 'lobby'],
            where: {
                user: event.entity.user,
            },
        })
        if (lobbyUser) {
            await event.manager.remove(LobbyUser, lobbyUser)
            this.lobbyGateway.sendLobbyUsers(
                event.entity?.lobby,
                await event.manager.find(LobbyUser, {
                    relations: ['user', 'lobby'],
                    where: {
                        lobby: event.entity?.lobby,
                    },
                }),
            )
        }
    }

    async afterUpdate(event: UpdateEvent<LobbyUser>): Promise<void> {
        if (event.updatedColumns.some((column) => column.propertyName === 'disconnected')) {
            if (event.entity?.role === LobbyUserRole.Host) {
                if (event.entity?.disconnected === true) {
                    await event.manager.save(LobbyUser, {
                        ...event.entity,
                        role: LobbyUserRole.Player,
                    })
                }
            }
            await this.handleHostDisconnected(event)
        }
    }

    async afterRemove(event: RemoveEvent<LobbyUser>): Promise<void> {
        await this.handleHostDisconnected(event)
    }

    async handleHostDisconnected(
        event: UpdateEvent<LobbyUser> | RemoveEvent<LobbyUser>,
    ): Promise<void> {
        if (event.entity?.role === LobbyUserRole.Host) {
            const randomPlayer = await event.manager
                .createQueryBuilder(LobbyUser, 'lobbyUser')
                .andWhere('lobbyUser.lobby = :lobby')
                .andWhere('lobbyUser.role = :role')
                .andWhere('lobbyUser.disconnected = 0')
                .setParameter('lobby', event.entity?.lobby.id)
                .setParameter('role', LobbyUserRole.Player)
                .orderBy('RAND()')
                .getOne()
            if (randomPlayer) {
                await event.manager.save(LobbyUser, { ...randomPlayer, role: LobbyUserRole.Host })
            } else {
                await event.manager.remove(Lobby, event.entity?.lobby)
                this.lobbyGateway.sendLobbyClosed(event.entity?.lobby, 'The host left the lobby!')
            }
        }
        this.lobbyGateway.sendLobbyUsers(
            event.entity?.lobby,
            await event.manager.find(LobbyUser, {
                relations: ['user', 'lobby'],
                where: {
                    lobby: event.entity?.lobby,
                },
            }),
        )
    }
}
