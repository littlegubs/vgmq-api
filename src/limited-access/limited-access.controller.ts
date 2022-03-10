import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Request, Response } from 'express'

import { RecaptchaGuard } from '../auth/guards/recaptcha.guard'
import { LimitedAccessDto } from './dto/limited-access.dto'

@Controller('limited-access')
export class LimitedAccessController {
    constructor(private configService: ConfigService) {}

    @Get('allowed')
    allowed(@Req() request: Request): boolean {
        return request.cookies['pote'] !== undefined
    }

    @UseGuards(RecaptchaGuard)
    @Post('password')
    @HttpCode(200)
    password(
        @Body() limitedAccess: LimitedAccessDto,
        @Res({ passthrough: true }) response: Response,
    ): null {
        const date = new Date()
        date.setDate(date.getDate() + 365)
        response.cookie('pote', 'pote', {
            expires: date,
            secure: this.configService.get('ENV') !== 'dev',
            domain:
                this.configService.get('ENV') === 'dev'
                    ? undefined
                    : this.configService.get('COOKIE_DOMAIN'),
        })

        return null
    }
}
