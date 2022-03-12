import { InjectQueue, OnGlobalQueueStalled, Process, Processor } from '@nestjs/bull'
import { CACHE_MANAGER, Inject, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Job, Queue } from 'bull'
import { Cache } from 'cache-manager'
import { Repository } from 'typeorm'

import { LobbyMusic } from './entities/lobby-music.entity'
import { LobbyUser, LobbyUserRole } from './entities/lobby-user.entity'
import { Lobby, LobbyStatuses } from './entities/lobby.entity'
import { LobbyGateway } from './lobby.gateway'

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
        @InjectQueue('lobby')
        private lobbyQueue: Queue,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {}
    private readonly logger = new Logger(LobbyProcessor.name)

    @Process('playMusic')
    async playMusic(job: Job<string>): Promise<void> {
        const lobbyCode = job.data
        this.logger.debug(`Start playing music to lobby ${lobbyCode}`)
        let lobby = await this.lobbyRepository.findOne({
            relations: ['lobbyMusics'],
            where: { code: lobbyCode },
        })
        if (lobby === undefined) {
            this.logger.warn(`lobby ${lobbyCode} ERROR: Lobby has been deleted`)
            return
        }
        lobby = this.lobbyRepository.create({
            ...lobby,
            currentLobbyMusicPosition:
                lobby.currentLobbyMusicPosition === null ? 1 : lobby.currentLobbyMusicPosition + 1,
        })

        const lobbyMusic = await this.lobbyMusicRepository.findOne({
            relations: ['lobby'],
            where: {
                lobby: lobby,
                position: lobby.currentLobbyMusicPosition,
            },
        })
        if (lobbyMusic === undefined) {
            this.logger.error(
                `lobby ${lobby.code} ERROR: Trying to get a music that does not exist`,
            )
            lobby = await this.lobbyRepository.save({
                ...lobby,
                currentLobbyMusicPosition: null,
                status: LobbyStatuses.Waiting,
            })
            this.lobbyGateway.sendUpdateToRoom(lobby)
            return
        }

        lobby = await this.lobbyRepository.save({
            ...lobby,
            status: LobbyStatuses.PlayingMusic,
        })
        this.lobbyGateway.sendUpdateToRoom(lobby)
        this.lobbyGateway.sendLobbyMusicToLoad(lobbyMusic)
        await this.lobbyQueue.add('revealAnswer', lobby.code, {
            delay: lobby.guessTime * 1000,
        })
    }

    @Process('revealAnswer')
    async revealAnswer(job: Job<string>): Promise<void> {
        const lobbyCode = job.data
        this.logger.debug(`Start answer reveal to lobby ${lobbyCode}`)

        let lobby = await this.lobbyRepository.findOne({
            relations: ['lobbyMusics'],
            where: { code: lobbyCode },
        })
        if (lobby === undefined) {
            this.logger.warn(`lobby ${lobbyCode} ERROR: Lobby has been deleted`)
            return
        }
        lobby = await this.lobbyRepository.save({
            ...lobby,
            status: LobbyStatuses.AnswerReveal,
        })
        const currentLobbyMusic = await this.lobbyMusicRepository.findOne({
            relations: ['expectedAnswer'],
            where: {
                lobby,
                position: lobby.currentLobbyMusicPosition,
            },
        })
        if (currentLobbyMusic === undefined) {
            this.logger.error(
                `lobby ${lobby.code} ERROR: Trying to get a music that does not exist`,
            )
            lobby = await this.lobbyRepository.save({
                ...lobby,
                currentLobbyMusicPosition: null,
                status: LobbyStatuses.Waiting,
            })
            this.lobbyGateway.sendUpdateToRoom(lobby)
            return
        }
        this.lobbyGateway.sendUpdateToRoom(lobby)
        this.lobbyGateway.sendAnswer(lobby, currentLobbyMusic.expectedAnswer)

        await this.lobbyQueue.add(
            lobby.currentLobbyMusicPosition === lobby.lobbyMusics.length
                ? 'finalResult'
                : 'playMusic',
            lobby.code,
            {
                delay: 10000,
            },
        )
    }

    @Process('finalResult')
    async finalResult(job: Job<string>): Promise<void> {
        const lobbyCode = job.data
        this.logger.debug(`Set lobby ${lobbyCode} back to waiting `)

        let lobby = await this.lobbyRepository.findOne({
            relations: ['lobbyMusics'],
            where: { code: lobbyCode },
        })
        if (lobby === undefined) {
            this.logger.warn(`lobby ${lobbyCode} ERROR: Lobby has been deleted`)
            return
        }
        lobby = await this.lobbyRepository.save({
            ...lobby,
            status: LobbyStatuses.Waiting,
            currentLobbyMusicPosition: null,
            lobbyMusics: [],
        })
        const disconnectedLobbyUsers = await this.lobbyUserRepository.find({
            lobby,
            disconnected: true,
        })
        await this.lobbyUserRepository.remove(disconnectedLobbyUsers)
        const lobbySpectators = await this.lobbyUserRepository.find({
            lobby,
            role: LobbyUserRole.Spectator,
        })
        await this.lobbyUserRepository.save(
            lobbySpectators.map((lobbyUser) => ({ ...lobbyUser, role: LobbyUserRole.Player })),
        )
        this.lobbyGateway.sendLobbyUsers(
            lobby,
            await this.lobbyUserRepository.find({
                relations: ['user', 'lobby'],
                where: {
                    lobby: lobby,
                },
            }),
        )
        this.lobbyGateway.sendLobbyReset(lobby)
    }

    @OnGlobalQueueStalled()
    onStalled(job: Job): void {
        this.logger.error(`Job stalled ${job.id} of type ${job.name} with data ${job.data}...`)
    }
}