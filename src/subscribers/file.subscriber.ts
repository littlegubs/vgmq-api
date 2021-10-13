import * as fs from 'fs'

import { Connection, EntitySubscriberInterface, EventSubscriber, RemoveEvent } from 'typeorm'

import { File } from '../entity/file.entity'

@EventSubscriber()
export class FileSubscriber implements EntitySubscriberInterface<File> {
    constructor(connection: Connection) {
        connection.subscribers.push(this)
    }

    listenTo(): typeof File {
        return File
    }

    afterRemove(event: RemoveEvent<File>): void {
        if (event.entity?.path && fs.existsSync(event.entity.path)) {
            fs.unlinkSync(event.entity.path)
        }
    }
}
