import { InjectQueue, OnGlobalQueueStalled, Process, Processor } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Job, Queue } from 'bull'
import * as dayjs from 'dayjs'
import { In, Not, Repository } from 'typeorm'

import { MusicAccuracy } from '../games/entity/music-accuracy.entity'
import { User } from '../users/user.entity'
import { UsersService } from '../users/users.service'
import { LobbyMusic } from './entities/lobby-music.entity'
import { LobbyUser, LobbyUserRole, LobbyUserStatus } from './entities/lobby-user.entity'
import { Lobby, LobbyGameModes, LobbyStatuses } from './entities/lobby.entity'
import { LobbyGateway } from './lobby.gateway'
import { LobbyUserService } from './services/lobby-user.service'

@Processor('lobby')
export class LobbyProcessor {
    constructor(
        private lobbyGateway: LobbyGateway,
        @InjectRepository(Lobby)
        private lobbyRepository: Repository<Lobby>,
        @InjectRepository(LobbyMusic)
        private lobbyMusicRepository: Repository<LobbyMusic>,
        @InjectRepository(LobbyUser)
        private lobbyUserRepository: Repository<LobbyUser>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(MusicAccuracy)
        private musicAccuracyRepository: Repository<MusicAccuracy>,
        @InjectQueue('lobby')
        private lobbyQueue: Queue,
        private lobbyUserService: LobbyUserService,
        private userService: UsersService,
    ) {}
    private readonly logger = new Logger(LobbyProcessor.name)

    @Process('bufferMusic')
    async buffer(job: Job<string>): Promise<void> {
        const lobbyCode = job.data
        this.logger.debug(`Start buffering music to lobby ${lobbyCode}`)
        let lobby = await this.lobbyRepository.findOne({
            relations: ['lobbyMusics'],
            where: {
                code: lobbyCode,
                status: In([LobbyStatuses.Playing, LobbyStatuses.AnswerReveal]),
            },
        })
        if (lobby === null) {
            this.logger.warn(`lobby ${lobbyCode} ERROR: Lobby has been deleted`)
            return
        }
        if (lobby.status === LobbyStatuses.Playing) {
            lobby = this.lobbyRepository.create({
                ...lobby,
                currentLobbyMusicPosition: 1,
                status: LobbyStatuses.Buffering,
            })
        }

        const lobbyMusic = await this.lobbyMusicRepository.findOne({
            relations: {
                lobby: true,
                gameToMusic: {
                    music: true,
                },
            },
            where: {
                lobby: {
                    id: lobby.id,
                },
                position:
                    lobby.status === LobbyStatuses.Buffering
                        ? 1
                        : lobby.currentLobbyMusicPosition! + 1,
            },
        })
        if (!lobbyMusic) {
            await this.lobbyQueue.add('finalResult', lobby.code)
            return
        }

        lobby = this.lobbyRepository.create(
            await this.lobbyRepository.save({
                ...lobby,
            }),
        )

        const lobbyUsers = await this.lobbyUserRepository.find({
            relations: {
                user: true,
                lobby: true,
            },
            where: {
                lobby: {
                    id: lobby.id,
                },
                disconnected: false,
            },
        })
        await this.lobbyUserRepository.save(
            lobbyUsers.map((lobbyUser) => ({
                ...lobbyUser,
                status: LobbyUserStatus.Buffering,
            })),
        )
        await this.lobbyGateway.sendLobbyUsers(lobby)
        await this.lobbyQueue.add('playMusic', lobbyMusic.lobby.code, {
            delay: 5 * 1000,
        })
        if (lobby.status === LobbyStatuses.Buffering) {
            this.lobbyGateway.sendUpdateToRoom(lobby)
        }
        await this.lobbyGateway.sendLobbyMusicToLoad(lobbyMusic)
    }

    @Process('playMusic')
    async playMusic(job: Job<string>): Promise<void> {
        const lobbyCode = job.data
        this.logger.debug(`Start playing music to lobby ${lobbyCode}`)
        let lobby = await this.lobbyRepository.findOne({
            relations: ['lobbyMusics'],
            where: {
                code: lobbyCode,
                status: Not(LobbyStatuses.PlayingMusic),
            },
        })
        if (lobby === null) {
            this.logger.warn(`lobby ${lobbyCode} ERROR: Lobby has been deleted`)
            return
        }

        let lobbyUsers = await this.lobbyUserRepository.find({
            relations: {
                lobby: true,
                user: true,
            },
            where: {
                lobby: {
                    id: lobby.id,
                },
            },
        })

        if (lobby.status === LobbyStatuses.AnswerReveal) {
            lobby = this.lobbyRepository.create({
                ...lobby,
                currentLobbyMusicPosition:
                    lobby.currentLobbyMusicPosition === null
                        ? 1
                        : lobby.currentLobbyMusicPosition + 1,
            })
            if (!(await this.lobbyUserService.areAllUsersReadyToPlay(lobby))) {
                lobby = this.lobbyRepository.create(
                    await this.lobbyRepository.save({
                        ...lobby,
                        status: LobbyStatuses.Buffering,
                    }),
                )
                lobbyUsers = this.lobbyUserRepository.create(
                    await this.lobbyUserRepository.save(
                        lobbyUsers.map((lobbyUser) => ({
                            ...lobbyUser,
                            correctAnswer: null,
                            playedTheGame: null,
                        })),
                    ),
                )
                await this.lobbyGateway.sendLobbyUsers(lobby, lobbyUsers)
                this.lobbyGateway.sendUpdateToRoom(lobby)
                await this.lobbyQueue.add('playMusic', lobby.code, {
                    delay: 5 * 1000,
                    jobId: `lobby${lobby.code}playMusic${lobby.currentLobbyMusicPosition}`,
                })
                return
            }
        }

        lobby = this.lobbyRepository.create(
            await this.lobbyRepository.save({
                ...lobby,
                status: LobbyStatuses.PlayingMusic,
            }),
        )

        const lobbyMusic = await this.lobbyMusicRepository.findOne({
            relations: {
                lobby: true,
                gameToMusic: {
                    music: true,
                },
            },
            where: {
                lobby: {
                    id: lobby.id,
                },
                position: lobby.currentLobbyMusicPosition!,
            },
        })
        if (!lobbyMusic) {
            await this.lobbyQueue.add('finalResult', lobby.code)
            return
        }

        lobbyUsers = this.lobbyUserRepository.create(
            await this.lobbyUserRepository.save(
                lobbyUsers.map((lobbyUser) => ({
                    ...lobbyUser,
                    correctAnswer: null,
                    playedTheGame: null,
                    tries: 0,
                    ...(lobbyUser.status === LobbyUserStatus.ReadyToPlayMusic && { status: null }),
                })),
            ),
        )
        this.lobbyGateway.playMusic(lobbyMusic)
        this.lobbyGateway.sendUpdateToRoom(lobby)
        await this.lobbyGateway.sendLobbyUsers(lobby, lobbyUsers)
        await this.lobbyQueue.add('revealAnswer', lobby.code, {
            delay: lobby.guessTime * 1000,
            jobId: `lobby${lobby.code}revealAnswer${lobby.currentLobbyMusicPosition}`,
        })
        await this.lobbyMusicRepository.save({
            ...lobbyMusic,
            musicFinishPlayingAt: dayjs().add(lobbyMusic.lobby.guessTime, 'seconds').toDate(),
        })
    }

    @Process('revealAnswer')
    async revealAnswer(job: Job<string>): Promise<void> {
        const lobbyCode = job.data
        this.logger.debug(`Start answer reveal to lobby ${lobbyCode}`)

        let lobby = await this.lobbyRepository.findOne({
            relations: {
                lobbyMusics: true,
            },
            where: { code: lobbyCode, status: LobbyStatuses.PlayingMusic },
        })
        if (lobby === null) {
            this.logger.warn(`lobby ${lobbyCode} ERROR: Lobby has been deleted`)
            return
        }
        lobby = this.lobbyRepository.create(
            await this.lobbyRepository.save({
                ...lobby,
                status: LobbyStatuses.AnswerReveal,
            }),
        )
        const currentLobbyMusic = await this.lobbyMusicRepository.findOne({
            relations: {
                lobby: true,
                gameToMusic: {
                    music: true,
                    game: {
                        platforms: true,
                        cover: {
                            colorPalette: true,
                        },
                    },
                },
            },
            where: {
                lobby: {
                    id: lobby.id,
                },
                position: lobby.currentLobbyMusicPosition ?? 0,
            },
        })
        if (currentLobbyMusic === null) {
            this.logger.error(
                `lobby ${lobby.code} ERROR: Trying to get a music that does not exist`,
            )
            lobby = this.lobbyRepository.create(
                await this.lobbyRepository.save({
                    ...lobby,
                    currentLobbyMusicPosition: null,
                    status: LobbyStatuses.Waiting,
                }),
            )
            this.lobbyGateway.sendUpdateToRoom(lobby)
            return
        }
        let lobbyUsers = await this.lobbyUserRepository.find({
            relations: {
                user: true,
            },
            where: {
                lobby: {
                    id: lobby.id,
                },
                role: In([LobbyUserRole.Host, LobbyUserRole.Player]),
            },
        })

        for (const lobbyUser of lobbyUsers) {
            const userPlayedTheGame = await this.userService.userHasPlayedTheGame(
                lobbyUser.user,
                currentLobbyMusic.gameToMusic.game,
            )

            await this.lobbyUserRepository.save({
                ...lobbyUser,
                playedTheGame: !!userPlayedTheGame,
            })
        }
        await this.lobbyGateway.sendLobbyUsers(lobby)
        this.lobbyGateway.sendUpdateToRoom(lobby)
        this.lobbyGateway.sendAnswer(currentLobbyMusic)

        if (lobby.currentLobbyMusicPosition === lobby.lobbyMusics.length) {
            await this.lobbyQueue.add('finalResult', lobby.code, {
                delay: 10000,
                jobId: `lobby${lobby.code}finalResult${Date.now()}`,
            })
        } else {
            await this.lobbyQueue.add('bufferMusic', lobby.code, {
                delay: 5 * 1000,
                jobId: `lobby${lobby.code}bufferMusic${
                    lobby.currentLobbyMusicPosition === null
                        ? 1
                        : lobby.currentLobbyMusicPosition + 1
                }`,
            })
        }

        if (lobby.gameMode === LobbyGameModes.LocalCouch) {
            return
        }

        lobbyUsers = await this.lobbyUserRepository.find({
            relations: {
                user: true,
            },
            where: {
                lobby: {
                    id: lobby.id,
                },
                disconnected: false,
                role: In([LobbyUserRole.Host, LobbyUserRole.Player]),
            },
        })
        for (const lobbyUser of lobbyUsers) {
            const userPlayedTheGame = await this.userService.userHasPlayedTheGame(
                lobbyUser.user,
                currentLobbyMusic.gameToMusic.game,
            )

            if (!lobbyUser.disconnected && lobby.gameMode !== LobbyGameModes.LocalCouch) {
                await this.musicAccuracyRepository.save({
                    playedTheGame: !!userPlayedTheGame,
                    correctAnswer: !!lobbyUser.correctAnswer,
                    gameToMusic: currentLobbyMusic.gameToMusic,
                    user: lobbyUser.user,
                })
            }
        }
    }

    @Process('finalResult')
    async finalResult(job: Job<string>): Promise<void> {
        const lobbyCode = job.data
        this.logger.debug(`Set lobby ${lobbyCode} back to waiting `)

        let lobby = await this.lobbyRepository.findOne({
            relations: ['lobbyMusics'],
            where: { code: lobbyCode },
        })
        if (lobby === null) {
            this.logger.warn(`lobby ${lobbyCode} ERROR: Lobby has been deleted`)
            return
        }
        lobby = this.lobbyRepository.create(
            await this.lobbyRepository.save({
                ...lobby,
                status: LobbyStatuses.Waiting,
                currentLobbyMusicPosition: null,
                lobbyMusics: [],
            }),
        )
        const disconnectedLobbyUsers = await this.lobbyUserRepository.find({
            where: {
                lobby: {
                    id: lobby.id,
                },
                disconnected: true,
            },
        })
        if (lobby.gameMode !== LobbyGameModes.LocalCouch) {
            // remove disconnected users
            await this.lobbyUserRepository.remove(disconnectedLobbyUsers)
        } else {
            await this.lobbyUserRepository.save(
                disconnectedLobbyUsers.map((lobbyUser) => ({ ...lobbyUser, disconnected: false })),
            )
        }

        // set spectators as players
        const lobbySpectators = await this.lobbyUserRepository.find({
            where: {
                lobby: {
                    id: lobby.id,
                },
                role: LobbyUserRole.Spectator,
            },
        })
        await this.lobbyUserRepository.save(
            lobbySpectators.map((lobbyUser) => ({ ...lobbyUser, role: LobbyUserRole.Player })),
        )

        // set answers back to null
        const lobbyUsers = await this.lobbyUserRepository.find({
            relations: ['user', 'lobby'],
            where: {
                lobby: {
                    id: lobby.id,
                },
            },
        })
        await this.lobbyUserRepository.save(
            lobbyUsers.map((lobbyUser) => ({
                ...lobbyUser,
                correctAnswer: null,
                status: null,
                playedTheGame: null,
                points: 0,
                musicGuessedRight: 0,
                tries: 0,
            })),
        )

        await this.lobbyGateway.sendLobbyUsers(lobby)
        this.lobbyGateway.sendLobbyReset(lobby)
        await this.lobbyQueue.removeJobs(`lobby${lobby.code}bufferMusic*`)
        await this.lobbyQueue.removeJobs(`lobby${lobby.code}playMusic*`)
        await this.lobbyQueue.removeJobs(`lobby${lobby.code}revealAnswer*`)
        await this.lobbyQueue.removeJobs(`lobby${lobby.code}finalResult*`)
    }

    @Process('disconnectUser')
    async disconnectUser(job: Job<number>): Promise<void> {
        const lobbyUser = await this.lobbyUserRepository.findOne({
            where: {
                id: job.data,
                toDisconnect: true,
            },
        })
        if (lobbyUser === null) {
            return
        }
        if (
            lobbyUser.lobby.status === LobbyStatuses.Waiting ||
            lobbyUser.role === LobbyUserRole.Spectator
        ) {
            await this.lobbyUserRepository.remove(lobbyUser)
        } else {
            await this.lobbyUserRepository.save({ ...lobbyUser, disconnected: true })
        }
    }

    @OnGlobalQueueStalled()
    onStalled(job: Job): void {
        this.logger.error(`Job stalled ${job.id} of type ${job.name} with data ${job.data}...`)
    }
}
