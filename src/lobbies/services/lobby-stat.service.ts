import { Injectable, Inject } from '@nestjs/common'
import { RedisClientType } from 'redis'

@Injectable()
export class LobbyStatService {
    constructor(@Inject('RedisClient') private readonly redisClient: RedisClientType) {}

    async getValue(key: string): Promise<string | null> {
        return this.redisClient.get(key)
    }

    async setValue(key: string, value: string): Promise<void> {
        await this.redisClient.set(key, value)
    }
}
