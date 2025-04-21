import { spawn } from 'child_process'
import * as process from 'node:process'

import {
    InjectQueue,
    OnQueueStalled,
    Process,
    Processor,
    OnQueueError,
    OnQueueWaiting,
    OnQueueCompleted,
    OnQueueFailed,
} from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Job, Queue } from 'bull'
import dayjs from 'dayjs'
import { Exception } from 'handlebars'
import { In, Not, Repository } from 'typeorm'

import { MusicAccuracy } from '../games/entity/music-accuracy.entity'
import { S3Service } from '../s3/s3.service'
import { User } from '../users/user.entity'
import { UsersService } from '../users/users.service'
import { LobbyMusic } from './entities/lobby-music.entity'
import { LobbyUser, LobbyUserRole, LobbyUserStatus } from './entities/lobby-user.entity'
import { Lobby, LobbyGameModes, LobbyHintMode, LobbyStatuses } from './entities/lobby.entity'
import { LobbyGateway } from './lobby.gateway'
import { LobbyMusicLoaderService } from './services/lobby-music-loader.service'
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
        @InjectQueue('lobby') private lobbyQueue: Queue,
        private lobbyUserService: LobbyUserService,
        private userService: UsersService,
        private s3Service: S3Service,
        private lobbyMusicLoaderService: LobbyMusicLoaderService,
        private configService: ConfigService,
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

        let lobbyMusic = await this.lobbyMusicRepository.findOne({
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
            if (lobby.custom && lobby.musicNumber !== -1) {
                this.logger.debug(`will call finalResult for lobby ${lobby.code}`)
                await this.lobbyQueue
                    .add('finalResult', lobby.code, {
                        jobId: `lobby${lobby.code}finalResultFromBufferMusic-${Date.now()}`,
                    })
                    .catch((reason) => {
                        this.logger.debug(`finalResult couldn't be called, reason: ${reason}`)
                    })
                this.logger.debug(`finalResult called for lobby ${lobby.code}`)
                return
            }
            const countUsers = await this.lobbyUserRepository.count({
                relations: { lobby: true },
                where: {
                    lobby: {
                        id: lobby.id,
                    },
                },
            })
            if (countUsers === 0) {
                lobby.loopsWithNoUsers += 1
                if (lobby.loopsWithNoUsers > 5) {
                    this.logger.debug(`will call public finalResult for lobby ${lobby.code}`)
                    await this.lobbyQueue
                        .add('finalResult', lobby.code, {
                            jobId: `publicLobby${
                                lobby.code
                            }finalResultFromBufferMusic-${Date.now()}`,
                        })
                        .catch((reason) => {
                            this.logger.debug(`finalResult couldn't be called, reason: ${reason}`)
                        })
                    this.logger.debug(`public finalResult called for lobby ${lobby.code}`)
                    return
                }
                await this.lobbyRepository.save(lobby)
            }
            lobbyMusic = await this.lobbyMusicLoaderService.loadMusic(lobby)
            lobby.lobbyMusics = [...lobby.lobbyMusics, lobbyMusic]
        }

        lobby = this.lobbyRepository.create(
            await this.lobbyRepository.save({
                ...lobby,
            }),
        )

        let lobbyUsers = await this.lobbyUserRepository.find({
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
        lobbyUsers = lobbyUsers.map((lobbyUser) =>
            Object.assign(lobbyUser, {
                ...lobbyUser,
                correctAnswer: lobbyUser.correctAnswer || null,
            }),
        )
        await this.lobbyUserRepository.save(lobbyUsers)
        this.lobbyGateway.sendLobbyStartBuffer(lobby)
        await this.lobbyGateway.sendLobbyUsers(lobby, lobbyUsers)
        this.logger.debug(`will call playMusic for lobby ${lobby.code}`)
        await this.lobbyQueue
            .add('playMusic', lobbyMusic.lobby.code, {
                delay: 5 * 1000,
                jobId: `lobby${lobby.code}playMusic-${Date.now()}`,
            })
            .catch((reason) => {
                this.logger.debug(`playMusic couldn't be called, reason: ${reason}`)
            })
        this.logger.debug(`playMusic should start in 5s for lobby ${lobby.code}`)
        if (lobby.status === LobbyStatuses.Buffering) {
            this.lobbyGateway.sendUpdateToRoom(lobby)
        }
        const gameToMusic = lobbyMusic.gameToMusic
        const url = await this.s3Service.getSignedUrl(gameToMusic.music.file.path)
        const ffmpegPath = this.configService.get<string>('FFMPEG_PATH')
        if (ffmpegPath === undefined) {
            throw new Exception('FFMPEG_PATH could not be found.')
        }
        const ffmpegArgs = this.configService.get<string>('FFMPEG_ARGS') ?? ''
        const command = `${ffmpegArgs} -i "${url}" -ss ${
            lobbyMusic.startAt > 0 ? `${lobbyMusic.startAt}` : '0.001' // for some reason, the file is broken if I start at 0 on chrome???
        } -t ${
            lobbyMusic.lobby.playMusicOnAnswerReveal
                ? lobbyMusic.lobby.guessTime + 10
                : lobbyMusic.lobby.guessTime
        } -map 0:a -map_metadata -1 -f mp3 -`
        const ffmpegProcess = spawn(ffmpegPath, command.split(' '), {
            env: process.env,
            shell: true,
        })
        let output: Buffer[] = []
        ffmpegProcess.stdout.on('data', (data: Buffer) => {
            output = [...output, data]
        })

        ffmpegProcess.stderr.on('data', () => {
            // somehow, listening to this event unlocks the event ffmpegProcess.stdout.on('data') for some files ???
        })
        this.logger.debug(`bufferMusic for ${lobby.code} could be stuck`)
        void new Promise((resolve, reject) => {
            void ffmpegProcess.on('close', (code) => {
                this.lobbyGateway.sendLobbyBufferEnd(lobby!)
                if (code === 0) {
                    lobbyUsers = lobbyUsers.map((lobbyUser) =>
                        Object.assign(lobbyUser, {
                            ...lobbyUser,
                            status: LobbyUserStatus.Buffering,
                        }),
                    )
                    void this.lobbyUserRepository.save(lobbyUsers).then(() => {
                        void this.lobbyGateway.sendLobbyUsers(lobby!, lobbyUsers).then(() => {
                            this.lobbyGateway.sendLobbyMusicToLoad(lobby!, Buffer.concat(output))
                        })
                    })
                    this.logger.debug(`nevermind! bufferMusic for ${lobby!.code} resolved`)
                    resolve(null)
                } else {
                    this.logger.debug(
                        `nevermind! bufferMusic for ${
                            lobby!.code
                        } rejected, but could still be stuck`,
                    )
                    reject('the server could not encode the music')
                }
            })
        }).catch(async (err: string) => {
            this.lobbyGateway.sendLobbyError(lobby!, err)
            this.logger.debug(`bufferMusic for ${lobby!.code}: catch ffmpeg error part 1/3`)
            lobbyUsers = lobbyUsers.map((lobbyUser) =>
                Object.assign(lobbyUser, {
                    ...lobbyUser,
                    status: null,
                }),
            )
            await this.lobbyUserRepository.save(lobbyUsers)
            this.logger.debug(`bufferMusic for ${lobby!.code}: catch ffmpeg error part 2/3`)
            await this.lobbyGateway.sendLobbyUsers(lobby!, lobbyUsers)
            this.logger.debug(`bufferMusic for ${lobby!.code}: catch ffmpeg error part 3/3`)
        })
        this.logger.debug(`bufferMusic for ${lobby.code} fully unstuck!`)
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
            this.logger.debug('ok,lobby not found, but what was its status then?')
            const hihiLobby = await this.lobbyRepository.findOne({
                where: {
                    code: lobbyCode,
                },
            })
            this.logger.debug(`lobby ${lobbyCode} status was ${hihiLobby?.status}`)
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
                lobbyUsers = lobbyUsers.map((lobbyUser) =>
                    Object.assign(lobbyUser, {
                        ...lobbyUser,
                        correctAnswer: null,
                        playedTheGame: null,
                        hintMode:
                            lobby!.hintMode === LobbyHintMode.Always || lobbyUser.keepHintMode, // why do I have to use '!' here ??
                        answer: null,
                    }),
                )
                await this.lobbyUserRepository.save(lobbyUsers)
                await this.lobbyGateway.sendLobbyUsers(lobby, lobbyUsers)
                this.lobbyGateway.sendUpdateToRoom(lobby)
                this.logger.debug(`will call playMusicForced for lobby ${lobby.code}`)
                await this.lobbyQueue
                    .add('playMusic', lobby.code, {
                        delay: 5 * 1000,
                        jobId: `lobby${lobby.code}playMusicForced-${Date.now()}`,
                    })
                    .catch((reason) => {
                        this.logger.debug(`playMusic couldn't be called, reason: ${reason}`)
                    })
                this.logger.debug(`playMusicForced for lobby ${lobby.code} should start in 5sec...`)
                return
            }
        }
        this.logger.debug(`about to set lobby ${lobby.code} to status play_music`)
        lobby = this.lobbyRepository.create(
            await this.lobbyRepository.save({
                ...lobby,
                status: LobbyStatuses.PlayingMusic,
            }),
        )
        this.logger.debug(`set lobby ${lobby.code} to status play_music`)

        const lobbyMusic = await this.lobbyMusicRepository.findOne({
            relations: {
                lobby: true,
                gameToMusic: {
                    music: true,
                },
                hintModeGames: true,
            },
            where: {
                lobby: {
                    id: lobby.id,
                },
                position: lobby.currentLobbyMusicPosition!,
            },
        })
        if (!lobbyMusic) {
            await this.lobbyQueue
                .add('finalResult', lobby.code, {
                    jobId: `lobby${lobby.code}finalResultFromPlayMusic-${Date.now()}`,
                })
                .catch((reason) => {
                    this.logger.debug(`finalResult couldn't be called, reason: ${reason}`)
                })
            return
        }

        lobbyUsers = lobbyUsers.map((lobbyUser) =>
            Object.assign(lobbyUser, {
                ...lobbyUser,
                correctAnswer: null,
                playedTheGame: null,
                tries: 0,
                ...(lobbyUser.status === LobbyUserStatus.ReadyToPlayMusic && { status: null }),
                hintMode: lobby!.hintMode === LobbyHintMode.Always || lobbyUser.keepHintMode, // why do I have to use '!' here ??
                answer: null,
            }),
        )
        await this.lobbyUserRepository.save(lobbyUsers)
        const lobbyUsersHintMode = lobbyUsers.filter((lobbyUser) => lobbyUser.hintMode)
        if (lobbyUsersHintMode.length > 0) {
            this.lobbyGateway.showHintModeGamesToHintModeUsers(lobbyMusic, lobbyUsersHintMode)
        }

        await this.lobbyGateway.sendLobbyUsers(lobby, lobbyUsers)
        this.lobbyGateway.playMusic(lobbyMusic)
        this.lobbyGateway.sendUpdateToRoom(lobby)
        this.logger.debug(`will call revealAnswer for lobby ${lobby.code}`)
        await this.lobbyQueue
            .add('revealAnswer', lobby.code, {
                delay: lobby.guessTime * 1000,
                jobId: `lobby${lobby.code}revealAnswer${
                    lobby.currentLobbyMusicPosition
                }-${Date.now()}`,
            })
            .catch((reason) => {
                this.logger.debug(`revealAnswer couldn't be called, reason: ${reason}`)
            })
        this.logger.debug(
            `revealAnswer for lobby ${lobby.code} should start in ${lobby.guessTime}sec...`,
        )
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
                video: true,
                screenshots: true,
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

        for (let lobbyUser of lobbyUsers) {
            if (lobbyUser.hintMode && lobbyUser.answer) {
                lobbyUser = await this.lobbyGateway.verifyAnswer(lobby, lobbyUser.answer, lobbyUser)
            }
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

        if (
            lobby.currentLobbyMusicPosition === lobby.lobbyMusics.length &&
            lobby.custom &&
            lobby.musicNumber !== -1
        ) {
            this.logger.debug(`will call finalResult for lobby ${lobby.code}`)
            await this.lobbyQueue
                .add('finalResult', lobby.code, {
                    delay: 10000,
                    jobId: `lobby${lobby.code}finalResult-${Date.now()}`,
                })
                .catch((reason) => {
                    this.logger.debug(`finalResult couldn't be called, reason: ${reason}`)
                })
            this.logger.debug(`finalResult for lobby ${lobby.code} should have been called`)
        } else {
            this.logger.debug(`will call bufferMusic for lobby ${lobby.code}`)
            await this.lobbyQueue
                .add('bufferMusic', lobby.code, {
                    delay: 5 * 1000,
                    jobId: `lobby${lobby.code}bufferMusic-${Date.now()}`,

                    // timeout: 10_000, TODO maybe this was the cause ?
                })
                .catch((reason) => {
                    this.logger.debug(`bufferMusic couldn't be called, reason: ${reason}`)
                })
            this.logger.debug(`bufferMusic for lobby ${lobby.code} should start in 5sec...`)
        }

        if (
            lobby.gameMode === LobbyGameModes.LocalCouch ||
            (!lobby.custom && lobby.musicNumber === -1)
        ) {
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
            if (!lobbyUser.disconnected) {
                const userPlayedTheGame = await this.userService.userHasPlayedTheGame(
                    lobbyUser.user,
                    currentLobbyMusic.gameToMusic.game,
                )

                await this.musicAccuracyRepository.save({
                    playedTheGame: !!userPlayedTheGame,
                    correctAnswer: !!lobbyUser.correctAnswer,
                    gameToMusic: currentLobbyMusic.gameToMusic,
                    hintMode: lobbyUser.hintMode,
                    user: lobbyUser.user,
                })
            }
        }
    }

    @Process('finalResult')
    async finalResult(job: Job<string>): Promise<void> {
        const lobbyCode = job.data
        this.logger.debug(`Set lobby ${lobbyCode} back to waiting `)

        await this.resetLobby(lobbyCode)
    }

    private async resetLobby(lobbyCode: string): Promise<void> {
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
                loopsWithNoUsers: 0,
                currentLobbyMusicPosition: null,
                lobbyMusics: [],
            }),
        )
        await this.lobbyQueue.removeJobs(`*${lobbyCode}*`)
        await this.removeDisconnectedUsers(lobby)
        await this.setSpectatorsAsPlayer(lobby)
        await this.resetUserState(lobby)

        await this.lobbyGateway.sendLobbyUsers(lobby)
        this.lobbyGateway.sendLobbyReset(lobby)
    }

    private async resetUserState(lobby: Lobby): Promise<void> {
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
                answer: null,
                status: null,
                playedTheGame: null,
                points: 0,
                musicGuessedRight: 0,
                tries: 0,
                hintMode: false,
                keepHintMode: false,
            })),
        )
    }

    private async removeDisconnectedUsers(lobby: Lobby): Promise<void> {
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
    }

    private async setSpectatorsAsPlayer(lobby: Lobby): Promise<void> {
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
            lobbyUser.role === LobbyUserRole.Spectator ||
            (!lobbyUser.lobby.custom && lobbyUser.lobby.musicNumber === -1)
        ) {
            await this.lobbyUserRepository.remove(lobbyUser)
        } else {
            await this.lobbyUserRepository.save({ ...lobbyUser, disconnected: true })
        }
    }

    @OnQueueStalled()
    onStalled(job: Job): void {
        this.logger.error(`Job stalled ${job.id} of type ${job.name} with data ${job.data}...`)
    }

    @OnQueueError()
    onError(error: Error): void {
        this.logger.error(`Job error`)
        this.logger.error(`${error.message}`)
        this.logger.error(`${error.stack}`)
    }

    @OnQueueWaiting()
    onWaiting(jobId: number): void {
        this.logger.log(`Job waiting ${jobId}`)
    }

    @OnQueueCompleted()
    onComplete(job: Job): void {
        this.logger.log(`Job completed ${job.id} of type ${job.name} with data ${job.data}...`)
    }

    @OnQueueFailed()
    onFail(job: Job<string>, err: Error): void {
        this.logger.error(
            `Job failed ${job.id} of type ${job.name} with data ${job.data}... due to error:`,
        )
        this.logger.error(`${err.message}`)
        this.logger.error(`${err.stack}`)
        const lobbyCode = job.data
        this.logger.debug(`Set lobby ${lobbyCode} back to waiting after error`)

        void this.resetLobby(lobbyCode)
    }
}
