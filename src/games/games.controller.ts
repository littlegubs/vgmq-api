import { Controller, Get, Query } from '@nestjs/common'

import { GamesImportDto } from './dto/games-import.dto'
import { GamesSearchDto } from './dto/games-search.dto'
import { GamesService } from './services/games.service'
import { IgdbService } from './services/igdb.service'

@Controller('games')
export class GamesController {
    constructor(private gamesService: GamesService, private igdbService: IgdbService) {}

    @Get('')
    get(@Query() query: GamesSearchDto) {
        return this.gamesService.findByName(query.query)
    }

    @Get('import')
    async importFromIgdb(@Query() query: GamesImportDto): Promise<void> {
        await this.igdbService.importByUrl(query.url)
    }
}
