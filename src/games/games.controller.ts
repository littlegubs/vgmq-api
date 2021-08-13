import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { GamesService } from './services/games.service';
import { GamesSearchDto } from './dto/games-search';

@Controller('games')
export class GamesController {
  constructor(private gamesService: GamesService) {}

  @Get('')
  get(@Query() query: GamesSearchDto) {
    this.gamesService.findByName(query.query);
  }
}
