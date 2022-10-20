import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FindManyOptions, Not, Repository } from 'typeorm'

import { User } from '../../users/user.entity'
import { LobbyUser, LobbyUserRole, LobbyUserStatus } from '../entities/lobby-user.entity'
import { Lobby } from '../entities/lobby.entity'

@Injectable()
export class LobbyUserService {
    constructor(
        @InjectRepository(LobbyUser)
        private lobbyUserRepository: Repository<LobbyUser>,
    ) {}

    async areAllUsersReadyToPlay(lobby: Lobby): Promise<boolean> {
        const countOptions: FindManyOptions<LobbyUser> = {
            relations: {
                lobby: true,
            },
            where: {
                lobby: {
                    id: lobby.id,
                },
                disconnected: false,
                role: Not(LobbyUserRole.Spectator),
            },
        }
        const countLobbyUsersPlaying = await this.lobbyUserRepository.count(countOptions)
        const countLobbyUsersReady = await this.lobbyUserRepository.count({
            ...countOptions,
            where: { ...countOptions.where, status: LobbyUserStatus.ReadyToPlayMusic },
        })

        return countLobbyUsersReady === countLobbyUsersPlaying
    }

    getLobbyUserByUsername(username: string, lobby: Lobby): Promise<LobbyUser | null> {
        return this.lobbyUserRepository.findOne({
            relations: {
                user: true,
                lobby: true,
            },
            where: {
                user: {
                    username: username,
                },
                lobby: {
                    id: lobby.id,
                },
            },
        })
    }

    getLobbyHostByUser(user: User): Promise<LobbyUser | null> {
        return this.lobbyUserRepository.findOne({
            relations: {
                user: true,
                lobby: true,
            },
            where: {
                user: {
                    id: user.id,
                },
                role: LobbyUserRole.Host,
            },
        })
    }
}
