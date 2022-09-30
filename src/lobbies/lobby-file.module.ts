import { Module } from '@nestjs/common'

import { LobbyFileGateway } from './lobby-file.gateway'

@Module({
    controllers: [],
    imports: [],
    providers: [LobbyFileGateway],
})
export class LobbyFileModule {}
