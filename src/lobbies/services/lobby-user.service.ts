import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { FindManyOptions, LessThan, Not, Repository } from 'typeorm'

import { User } from '../../users/user.entity'
import { LobbyUser, LobbyUserRole, LobbyUserStatus } from '../entities/lobby-user.entity'
import { Lobby } from '../entities/lobby.entity'
import dayjs from 'dayjs'

@Injectable()
export class LobbyUserService {
    constructor(@InjectRepository(LobbyUser) private lobbyUserRepository: Repository<LobbyUser>) {}

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

    getLobbyUserByUsername(username: string, lobby?: Lobby): Promise<LobbyUser | null> {
        return this.lobbyUserRepository.findOne({
            relations: {
                user: true,
                lobby: true,
            },
            where: {
                user: {
                    username: username,
                },
                ...(lobby && {
                    lobby: {
                        id: lobby.id,
                    },
                }),
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

    @Cron(CronExpression.EVERY_HOUR)
    async checkIfUserIsAFK(): Promise<void> {
        const lobbyUsers = await this.lobbyUserRepository.find({
            relations: { lobby: true },
            where: {
                lastAnswerAt: LessThan(dayjs().subtract(90, 'minute').toDate()),
            },
        })
        await this.lobbyUserRepository.remove(lobbyUsers)
    }
}
