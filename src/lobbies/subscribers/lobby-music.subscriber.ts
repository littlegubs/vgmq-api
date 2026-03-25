import { DataSource, EntitySubscriberInterface, EventSubscriber, RemoveEvent } from 'typeorm'

import { LobbyMusic } from '../entities/lobby-music.entity'
import path from 'node:path'
import { Inject, Logger } from '@nestjs/common'
import { PRIVATE_STORAGE } from '../../storage/storage.constants'
import { StorageService } from '../../storage/storage.interface'

@EventSubscriber()
export class LobbyMusicSubscriber implements EntitySubscriberInterface<LobbyMusic> {
    constructor(
        dataSource: DataSource,
        @Inject(PRIVATE_STORAGE) private privateStorageService: StorageService,
    ) {
        dataSource.subscribers.push(this)
    }
    private readonly logger = new Logger(LobbyMusicSubscriber.name)

    listenTo(): typeof LobbyMusic {
        return LobbyMusic
    }

    async beforeRemove(event: RemoveEvent<LobbyMusic>): Promise<void> {
        if (!event.entityId) {
            return
        }
        event.manager
            .findOne(LobbyMusic, {
                relations: { lobby: true },
                where: {
                    id: event.entityId,
                },
            })
            .then((lobbyMusic) => {
                if (lobbyMusic === null || lobbyMusic.loaded) {
                    return
                }
                const lobby = lobbyMusic.lobby
                const clipFilename = `lobby-${lobby.code}-round-${lobbyMusic.position}.mp3`
                const clipPath = path.join('clips', clipFilename)
                this.privateStorageService.deleteObject(clipPath).catch((err) => {
                    if (err.code !== 404) {
                        throw err
                    }
                })
            })
    }
}
