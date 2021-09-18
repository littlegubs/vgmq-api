import {Controller, Get, HttpCode, HttpStatus, Query, UseGuards} from '@nestjs/common'

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Role } from '../users/role.enum'
import { Roles } from '../users/roles.decorator'
import { RolesGuard } from '../users/roles.guard'
import { GamesImportDto } from './dto/games-import.dto'
import { GamesSearchDto } from './dto/games-search.dto'
import { Game } from './entity/game.entity'
import { GamesService } from './services/games.service'
import { IgdbService } from './services/igdb.service'

@Controller('games')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GamesController {
    constructor(private gamesService: GamesService, private igdbService: IgdbService) {}

    @Get('')
    get(@Query() query: GamesSearchDto): Promise<{ data: Game[]; count: number }> {
        return this.gamesService
            .findByName(query.query, query.limit, query.page)
            .then(([data, count]) => {
                return { data, count }
            })
    }

    @Roles(Role.Admin)
    @Get('import')
    @HttpCode(201)
    async importFromIgdb(@Query() query: GamesImportDto): Promise<string[]> {
        const game = await this.igdbService.importByUrl(query.url)
        let gamesImported = [game.name]
        let { parent, versionParent } = game
        while (parent) {
            gamesImported = [...gamesImported, parent.name]
            parent = parent.parent
        }
        while (versionParent) {
            gamesImported = [...gamesImported, versionParent.name]
            versionParent = versionParent.versionParent
        }

        return gamesImported
    }
}
