import { Module } from '@nestjs/common';
import {PassportModule} from "@nestjs/passport";

@Module({
    imports: [
        PassportModule.register({
            defaultStrategy: 'jwt',
            property: 'user',
        })
    ],
    providers: [

    ]
})
export class AuthModule {}
