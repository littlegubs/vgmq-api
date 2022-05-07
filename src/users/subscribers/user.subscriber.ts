import { Connection, EntitySubscriberInterface, EventSubscriber, UpdateEvent } from 'typeorm'

import { User } from '../user.entity'

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
    constructor(connection: Connection) {
        connection.subscribers.push(this)
    }

    listenTo(): typeof User {
        return User
    }

    async beforeUpdate(event: UpdateEvent<User>): Promise<void> {
        if (event.updatedColumns.some((column) => column.propertyName === 'password')) {
            await event.entity?.hashPassword()
        }
    }
}
