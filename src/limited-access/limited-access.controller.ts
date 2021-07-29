import {BadRequestException, Body, Controller, Get, Post, Req, Res, UseGuards} from '@nestjs/common';
import {Request, Response} from "express";
import {LimitedAccessDto} from "./dto/limited-access.dto";
import {ConfigService} from "@nestjs/config";


@Controller('limited-access')
export class LimitedAccessController {
    constructor(private configService: ConfigService) {}

    @Get('allowed')
    allowed(@Req() request: Request) {
        return request.cookies['pote'] !== undefined;
    }

    @Post('password')
    async password(@Body() limitedAccess: LimitedAccessDto, @Res({ passthrough: true }) response: Response) {
        const date = new Date()
        date.setDate(date.getDate() + 365)
        response.cookie('pote', 'pote', {
            expires: date,
            secure: this.configService.get('ENV') !== 'dev',
            domain: this.configService.get('ENV') === 'dev' ? null : this.configService.get('COOKIE_DOMAIN')
        })
    }
}
