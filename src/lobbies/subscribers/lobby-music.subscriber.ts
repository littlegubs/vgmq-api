import { DataSource, EntitySubscriberInterface, EventSubscriber, RemoveEvent } from 'typeorm'

import { LobbyMusic } from '../entities/lobby-music.entity'
import path from 'node:path'
import fs from 'node:fs'
import { Logger } from '@nestjs/common'

@EventSubscriber()
export class LobbyMusicSubscriber implements EntitySubscriberInterface<LobbyMusic> {
    constructor(dataSource: DataSource) {
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
                if (lobbyMusic === null) {
                    return
                }
                const lobby = lobbyMusic.lobby
                const clipsDir = path.join('.', 'upload', 'private', 'clips')
                const clipFilename = `lobby-${lobby.code}-round-${lobbyMusic.position}.mp3`
                const clipPath = path.join(clipsDir, clipFilename)
                fs.promises.rm(clipPath).catch((err) => {
                    if (err.code !== 'ENOENT') {
                        this.logger.error(`Could not remove clip file ${clipPath}:`, err)
                    }
                })
            })
    }
}
