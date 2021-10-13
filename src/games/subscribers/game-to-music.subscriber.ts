import { Connection, EntitySubscriberInterface, EventSubscriber, RemoveEvent } from 'typeorm'

import { GameToMusic } from '../entity/game-to-music.entity'
import { Music } from '../entity/music.entity'

@EventSubscriber()
export class GameToMusicSubscriber implements EntitySubscriberInterface<GameToMusic> {
    constructor(connection: Connection) {
        connection.subscribers.push(this)
    }

    listenTo(): typeof GameToMusic {
        return GameToMusic
    }

    async afterRemove(event: RemoveEvent<GameToMusic>): Promise<void> {
        if (event.entity?.music) {
            const countMusics = await event.manager.count(GameToMusic, {
                where: {
                    music: event.entity.music,
                },
            })
            if (countMusics === 0) {
                await event.manager.remove(Music, event.entity.music)
            }
        }
    }
}
