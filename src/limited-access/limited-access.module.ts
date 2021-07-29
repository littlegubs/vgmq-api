import { Module } from '@nestjs/common';
import {LimitedAccessController} from "./limited-access.controller";
import {LimitedAccessValidator} from "./limited-access.validator";

@Module({
    controllers: [LimitedAccessController],
    providers: [LimitedAccessValidator]
})
export class LimitedAccessModule {}
