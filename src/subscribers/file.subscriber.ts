import { DataSource, EntitySubscriberInterface, EventSubscriber, RemoveEvent } from 'typeorm'

import { File } from '../entity/file.entity'
import { S3Service } from '../s3/s3.service'

@EventSubscriber()
export class FileSubscriber implements EntitySubscriberInterface<File> {
    constructor(
        connection: DataSource,
        private s3Service: S3Service,
    ) {
        connection.subscribers.push(this)
    }

    listenTo(): typeof File {
        return File
    }

    async afterRemove(event: RemoveEvent<File>): Promise<void> {
        if (event.entity?.path) {
            await this.s3Service.deleteObject(event.entity?.path)
        }
    }
}
