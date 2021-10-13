import * as fs from 'fs'

import { Connection, EntitySubscriberInterface, EventSubscriber, RemoveEvent } from 'typeorm'

import { File } from '../../entity/file.entity'
import { Music } from '../../games/entity/music.entity'

@EventSubscriber()
export class MusicSubscriber implements EntitySubscriberInterface<Music> {
    constructor(connection: Connection) {
        connection.subscribers.push(this)
    }

    listenTo(): typeof Music {
        return Music
    }

    async afterRemove(event: RemoveEvent<Music>): Promise<void> {
        if (event.entity?.file) {
            await event.manager.remove(File, event.entity.file)
        }
    }
}
