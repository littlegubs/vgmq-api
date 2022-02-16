import { InjectQueue, Process, Processor } from '@nestjs/bull'
import { CACHE_MANAGER, Inject, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Job, Queue } from 'bull'
import { Cache } from 'cache-manager'
import { Repository } from 'typeorm'

import { Lobby, LobbyStatuses } from './entities/lobby.entity'
import { LobbyGateway } from './events/lobby.gateway'

@Processor('lobby')
export class LobbyProcessor {
    constructor(
        private lobbyGateway: LobbyGateway,
        @InjectRepository(Lobby)
        private lobbyRepository: Repository<Lobby>,
        @InjectQueue('lobby')
        private lobbyQueue: Queue,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {}
    private readonly logger = new Logger(LobbyProcessor.name)

    @Process('playMusic')
    async playMusic(job: Job<Lobby>): Promise<void> {
        const lobby = this.lobbyRepository.create({
            ...job.data,
            status: LobbyStatuses.PlayingMusic,
        })
        this.logger.debug(`Start playing music to lobby ${lobby.code}`)
        const currentMusicPosition: number | undefined = await this.cacheManager.get(
            `${lobby.code}_current_music_position`,
        )

        await this.cacheManager.set(
            `${lobby.code}_current_music_position`,
            currentMusicPosition === undefined ? 1 : currentMusicPosition + 1,
        )

        await this.lobbyRepository.save(lobby)
        this.lobbyGateway.sendUpdateToRoom(lobby)
        // await this.lobbyQueue.add('revealAnswer', lobby, {
        //     delay: 20000,
        // })
    }
    @Process('revealAnswer')
    async revealAnswer(job: Job<Lobby>): Promise<void> {
        const lobby = this.lobbyRepository.create({
            ...job.data,
            status: LobbyStatuses.AnswerReveal,
        })
        this.logger.debug(`Start answer reveal to lobby ${lobby.code}`)

        await this.lobbyRepository.save(lobby)
        this.lobbyGateway.sendUpdateToRoom(lobby)
    }
}
