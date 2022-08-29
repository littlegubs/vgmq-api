import { InjectQueue } from '@nestjs/bull'
import {
    CACHE_MANAGER,
    forwardRef,
    Inject,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Queue } from 'bull'
import { Cache } from 'cache-manager'
import { Brackets, In, IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm'

import { GameToMusic, GameToMusicType } from '../games/entity/game-to-music.entity'
import { Game } from '../games/entity/game.entity'
import { Music } from '../games/entity/music.entity'
import { User } from '../users/user.entity'
import { LobbyCreateDto } from './dto/lobby-create.dto'
import { LobbyMusic } from './entities/lobby-music.entity'
import { LobbyUser, LobbyUserRole } from './entities/lobby-user.entity'
import { Lobby, LobbyDifficulties, LobbyStatuses } from './entities/lobby.entity'
import { LobbyGateway } from './lobby.gateway'

@Injectable()
export class LobbyService {
    constructor(
        @InjectRepository(Lobby)
        private lobbyRepository: Repository<Lobby>,
        @InjectRepository(Game)
        private gameRepository: Repository<Game>,
        @InjectRepository(Music)
        private musicRepository: Repository<Music>,
        @InjectRepository(LobbyMusic)
        private lobbyMusicRepository: Repository<LobbyMusic>,
        @InjectRepository(LobbyUser)
        private lobbyUserRepository: Repository<LobbyUser>,
        @InjectRepository(GameToMusic)
        private gameToMusicRepository: Repository<GameToMusic>,
        @Inject(forwardRef(() => LobbyGateway))
        private lobbyGateway: LobbyGateway,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        @InjectQueue('lobby')
        private lobbyQueue: Queue,
    ) {}
    async findByName(query: string): Promise<Lobby[]> {
        const qb = this.lobbyRepository
            .createQueryBuilder('lobby')
            .leftJoinAndSelect('lobby.lobbyMusics', 'lobbyMusic')
            .where('lobby.name LIKE :name')
            .setParameter('name', `%${query}%`)
        return qb.getMany()
    }

    async create(data: LobbyCreateDto, user: User): Promise<Lobby> {
        const lobby = await this.lobbyRepository.save({
            code: await this.generateCode(),
            name: data.name,
            password: data.password,
            musicNumber: data.musicNumber,
            guessTime: data.guessTime,
            allowDuplicates: data.allowDuplicates,
            difficulty: data.difficulty,
        })
        await this.lobbyUserRepository.save({
            lobby,
            user,
            role: LobbyUserRole.Host,
        })

        return lobby
    }

    async update(lobby: Lobby, data: LobbyCreateDto): Promise<void> {
        lobby = this.lobbyRepository.create({
            ...(await this.lobbyRepository.save({
                ...lobby,
                name: data.name,
                password: data.password,
                musicNumber: data.musicNumber,
                guessTime: data.guessTime,
                allowDuplicates: data.allowDuplicates,
                difficulty: data.difficulty,
            })),
        })

        this.lobbyGateway.sendUpdateToRoom(lobby)
    }

    async generateCode(): Promise<string> {
        const str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
        let code = ''
        do {
            for (let i = 0; i < 4; i++) {
                code += str[Math.floor(Math.random() * str.length)]
            }
        } while (null !== (await this.lobbyRepository.findOneBy({ code })))

        if (code === '') {
            throw new InternalServerErrorException()
        }
        return code
    }

    async loadMusics(lobby: Lobby): Promise<void> {
        const players = await this.lobbyUserRepository.find({
            relations: ['user'],
            where: {
                lobby: {
                    id: lobby.id,
                },
                role: In([LobbyUserRole.Player, LobbyUserRole.Host]),
            },
        })

        if (players === undefined || players.length === 0) {
            lobby = this.lobbyRepository.create({ ...lobby, status: LobbyStatuses.Waiting })
            await this.lobbyRepository.save(lobby)
            this.lobbyGateway.sendUpdateToRoom(lobby)
            throw new InternalServerErrorException()
        }

        let userIds: number[] = []
        let userIdsRandom: Array<number[] | undefined> = []
        players.forEach((player) => {
            userIds = [...userIds, player.user.id]
            userIdsRandom = [
                ...userIdsRandom,
                ...Array<number[]>(Math.floor(lobby.musicNumber / players.length)).fill([
                    player.user.id,
                ]),
            ]
        })
        if (userIdsRandom.length < lobby.musicNumber) {
            userIdsRandom = [
                ...userIdsRandom,
                ...Array(lobby.musicNumber - userIdsRandom.length).fill([
                    userIds[Math.floor(Math.random() * userIds.length)],
                ]),
            ]
        }
        userIdsRandom = userIdsRandom
            .map((value) => ({ value, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ value }) => value)

        let gameIds: number[] = []
        let blackListGameIds: number[] = []
        let lobbyMusics: LobbyMusic[] = []
        let position = 0

        const countGameToMusic = await this.gameToMusicRepository.count({
            relations: {
                music: true,
            },
            where: {
                music: {
                    duration: MoreThanOrEqual(lobby.guessTime),
                },
            },
        })
        const countGameToMusicWithAccuracy = await this.gameToMusicRepository.count({
            relations: {
                music: true,
            },
            where: {
                music: {
                    duration: MoreThanOrEqual(lobby.guessTime),
                },
                guessAccuracy: Not(IsNull()),
            },
        })
        const gameToMusicAccuracyRatio = countGameToMusicWithAccuracy / countGameToMusic
        while (userIdsRandom.some((userId) => userId !== undefined)) {
            for (const userId of userIdsRandom) {
                if (userId === undefined) {
                    continue
                }
                const i = userIdsRandom.indexOf(userId)
                const qb = this.gameRepository
                    .createQueryBuilder('game')
                    .select('game.id')
                    .innerJoin('game.musics', 'gameToMusic')
                    .innerJoin('gameToMusic.music', 'music')
                    .innerJoin('game.users', 'user')
                    .andWhere('game.enabled = 1')
                    .andWhere('user.id in (:userIds)', { userIds: userId })
                    .andWhere('music.duration >= :guessTime')
                    .setParameter('guessTime', lobby.guessTime)
                    .groupBy('game.id')
                    .orderBy('RAND()')

                if (!lobby.allowDuplicates && gameIds.length > 0) {
                    qb.andWhere('game.id not in (:ids)', { ids: gameIds })
                }
                if (blackListGameIds.length > 0) {
                    qb.andWhere('game.id not in (:blackListIds)', {
                        blackListIds: blackListGameIds,
                    })
                }
                const game = await qb.getOne()

                if (game !== null) {
                    const contributeMissingData = Math.random() > gameToMusicAccuracyRatio
                    gameIds = [...gameIds, game.id]
                    const qb = this.gameToMusicRepository
                        .createQueryBuilder('gameToMusic')
                        .leftJoinAndSelect('gameToMusic.music', 'music')
                        .leftJoinAndSelect('music.file', 'file')
                        .leftJoinAndSelect('gameToMusic.game', 'game')
                        .leftJoinAndSelect('gameToMusic.derivedGameToMusics', 'derivedGameToMusics')
                        .leftJoinAndSelect('derivedGameToMusics.game', 'derivedGames')
                        .leftJoinAndSelect('gameToMusic.originalGameToMusic', 'originalGameToMusic')
                        .leftJoinAndSelect('originalGameToMusic.game', 'originalGame')
                        .leftJoinAndSelect(
                            'originalGameToMusic.derivedGameToMusics',
                            'originalDerivedGameToMusics',
                        )
                        .leftJoinAndSelect(
                            'originalDerivedGameToMusics.game',
                            'originalDerivedGames',
                        )
                        .andWhere('gameToMusic.game = :game')
                        .andWhere('music.duration >= :guessTime')
                        .setParameter('game', game.id)
                        .setParameter('guessTime', lobby.guessTime)
                        .orderBy('RAND()')

                    if (lobbyMusics.length > 0) {
                        qb.andWhere('gameToMusic.id NOT IN (:musicIds)', {
                            musicIds: lobbyMusics.map((lobbyMusic) => lobbyMusic.gameToMusic.id),
                        })
                    }

                    let gameToMusic: GameToMusic | null = null
                    if (contributeMissingData) {
                        const qbContributeToMissingData = qb.clone()
                        qbContributeToMissingData.andWhere('gameToMusic.guessAccuracy IS NULL')

                        gameToMusic = await qbContributeToMissingData.getOne()
                    }

                    qb.andWhere(
                        new Brackets((difficultyQb) => {
                            if (lobby.difficulty.includes(LobbyDifficulties.Easy))
                                difficultyQb.orWhere('gameToMusic.guessAccuracy > 0.66')
                            if (lobby.difficulty.includes(LobbyDifficulties.Medium))
                                difficultyQb.orWhere(
                                    'gameToMusic.guessAccuracy BETWEEN 0.33 AND 0.66',
                                )
                            if (lobby.difficulty.includes(LobbyDifficulties.Hard))
                                difficultyQb.orWhere('gameToMusic.guessAccuracy < 0.33')
                        }),
                    )
                    if (!contributeMissingData) {
                        gameToMusic = await qb.getOne()
                    }

                    if (!gameToMusic && contributeMissingData) {
                        gameToMusic = await qb.getOne()
                    }

                    if (!gameToMusic) {
                        blackListGameIds = [...blackListGameIds, game.id]
                        continue
                    }

                    position += 1
                    const music = gameToMusic.music
                    const endAt = this.getRandomFloat(lobby.guessTime, music.duration, 4)
                    const startAt = endAt - lobby.guessTime
                    let expectedAnswers: Game[] = []
                    if (gameToMusic.type === GameToMusicType.Original) {
                        expectedAnswers = [gameToMusic.game]
                        if (gameToMusic.derivedGameToMusics) {
                            expectedAnswers = [
                                ...expectedAnswers,
                                ...gameToMusic.derivedGameToMusics.map(
                                    (derivedGameMusic) => derivedGameMusic.game,
                                ),
                            ]
                        }
                    } else {
                        const originalGameToMusic = gameToMusic.originalGameToMusic
                        if (originalGameToMusic !== null) {
                            expectedAnswers = [originalGameToMusic.game]
                            if (originalGameToMusic.derivedGameToMusics) {
                                expectedAnswers = [
                                    ...expectedAnswers,
                                    ...originalGameToMusic.derivedGameToMusics.map(
                                        (derivedGameMusic) => derivedGameMusic.game,
                                    ),
                                ]
                            }
                        }
                    }
                    lobbyMusics = [
                        ...lobbyMusics,
                        this.lobbyMusicRepository.create({
                            lobby,
                            gameToMusic,
                            position,
                            startAt,
                            endAt,
                            expectedAnswers,
                            contributeToMissingData: contributeMissingData,
                        }),
                    ]
                    userIdsRandom.splice(i, 1, undefined)
                    await this.gameToMusicRepository.save({
                        ...gameToMusic,
                        playNumber: gameToMusic.playNumber + 1,
                    })
                } else {
                    if (userId.length === userIds.length) {
                        userIdsRandom.splice(i, 1, undefined)
                        continue
                    }
                    userIdsRandom = userIdsRandom.map((v) => {
                        if (Array.isArray(v) && v === userId) {
                            const userIdsFiltered = userIds.filter((uid) => !v?.includes(uid))
                            const random =
                                userIdsFiltered[Math.floor(Math.random() * userIdsFiltered.length)]
                            if (random) {
                                return [...v, random]
                            }
                        }
                        return v
                    })
                }
            }
        }

        if (lobbyMusics.length === 0) {
            lobby = this.lobbyRepository.create({ ...lobby, status: LobbyStatuses.Waiting })
            await this.lobbyRepository.save(lobby)
            this.lobbyGateway.sendUpdateToRoom(lobby)
            this.lobbyGateway.sendLobbyToast(lobby, 'No music were found!')

            return
        }
        lobby = this.lobbyRepository.create({ ...lobby, status: LobbyStatuses.Playing })
        await this.lobbyMusicRepository.save(lobbyMusics)
        await this.lobbyRepository.save(lobby)
        await this.lobbyQueue.add('playMusic', lobby.code)
    }

    getRandomFloat(min: number, max: number, decimals: number): number {
        const str = (Math.random() * (max - min) + min).toFixed(decimals)

        return parseFloat(str)
    }
}
