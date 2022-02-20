import { InjectQueue, OnGlobalQueueStalled, Process, Processor } from '@nestjs/bull'
import { CACHE_MANAGER, Inject, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Job, Queue } from 'bull'
import { Cache } from 'cache-manager'
import { Repository } from 'typeorm'

import { LobbyMusic } from './entities/lobby-music.entity'
import { Lobby, LobbyStatuses } from './entities/lobby.entity'
import { LobbyGateway } from './events/lobby.gateway'

@Processor('lobby')
export class LobbyProcessor {
    constructor(
        private lobbyGateway: LobbyGateway,
        @InjectRepository(Lobby)
        private lobbyRepository: Repository<Lobby>,
        @InjectRepository(LobbyMusic)
        private lobbyMusicRepository: Repository<LobbyMusic>,
        @InjectQueue('lobby')
        private lobbyQueue: Queue,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {
        console.log('oyoyo')
    }
    private readonly logger = new Logger(LobbyProcessor.name)

    @Process('playMusic')
    async playMusic(job: Job<Lobby>): Promise<void> {
        this.logger.debug('yoooo')
        let lobby = this.lobbyRepository.create({
            ...job.data,
            currentLobbyMusicPosition:
                job.data.currentLobbyMusicPosition === null
                    ? 1
                    : job.data.currentLobbyMusicPosition + 1,
        })
        this.logger.debug(`Start playing music to lobby ${lobby.code}`)

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
        await this.lobbyQueue.add('revealAnswer', lobby, {
            delay: lobby.guessTime * 1000,
        })
    }

    @Process('revealAnswer')
    async revealAnswer(job: Job<Lobby>): Promise<void> {
        let lobby = job.data
        this.logger.debug(`Start answer reveal to lobby ${lobby.code}`)

        lobby = await this.lobbyRepository.save({
            ...job.data,
            status: LobbyStatuses.AnswerReveal,
        })
        const currentLobbyMusic = await this.lobbyMusicRepository.findOne({
            relations: ['expectedAnswer'],
            where: {
                lobby,
                position: lobby.currentLobbyMusicPosition,
            },
        })
        this.lobbyGateway.sendUpdateToRoom(lobby)
        if (currentLobbyMusic) {
            this.lobbyGateway.sendAnswer(lobby, currentLobbyMusic.expectedAnswer)
        }
    }

    @OnGlobalQueueStalled()
    onStalled(job: Job): void {
        this.logger.error(`Job stalled ${job.id} of type ${job.name} with data ${job.data}...`)
    }
}
