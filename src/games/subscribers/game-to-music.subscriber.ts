import { Connection, EntitySubscriberInterface, EventSubscriber, RemoveEvent } from 'typeorm'

import { GameToMusic, GameToMusicType } from '../entity/game-to-music.entity'
import { Music } from '../entity/music.entity'

@EventSubscriber()
export class GameToMusicSubscriber implements EntitySubscriberInterface<GameToMusic> {
    constructor(connection: Connection) {
        connection.subscribers.push(this)
    }

    listenTo(): typeof GameToMusic {
        return GameToMusic
    }

    async beforeRemove(event: RemoveEvent<GameToMusic>): Promise<void> {
        const derivedGameToMusics = event.entity?.derivedGameToMusics
        if (derivedGameToMusics !== undefined && derivedGameToMusics.length > 0) {
            for (const gameToMusic of derivedGameToMusics) {
                await event.manager.save(GameToMusic, {
                    ...gameToMusic,
                    type: GameToMusicType.Original,
                    originalGameToMusic: null,
                })
            }
        }
    }

    async afterRemove(event: RemoveEvent<GameToMusic>): Promise<void> {
        if (event.entity?.music) {
            const countMusics = await event.manager.count(GameToMusic, {
                where: {
                    music: {
                        id: event.entity.music.id,
                    },
                },
            })
            if (countMusics === 0) {
                await event.manager.remove(Music, event.entity.music)
            }
        }
    }
}
