import { randomBytes } from 'crypto'

import { MailerService } from '@nestjs-modules/mailer'
import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AuthRegisterDto } from '../auth/dto/auth-register.dto'
import { Game } from '../games/entity/game.entity'
import { User } from './user.entity'

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private mailerService: MailerService,
        private configService: ConfigService,
    ) {}

    async create(createUserDto: AuthRegisterDto): Promise<void> {
        const user = this.userRepository.create(createUserDto)
        const vgmqClientUrl = this.configService.get<string>('VGMQ_CLIENT_URL')
        if (vgmqClientUrl === undefined) {
            throw new InternalServerErrorException()
        }
        const token = randomBytes(16).toString('hex')
        await this.userRepository.save(
            this.userRepository.create({ ...user, confirmationToken: token }),
        )
        const url = `${vgmqClientUrl}/register/${token}`
        await this.mailerService.sendMail({
            to: user.email,
            subject: 'Confirm your VGMQ account',
            template: 'confirmation',
            context: {
                url: url,
            },
        })
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: {
                email: email,
            },
        })
    }

    async findByUsername(username: string): Promise<User | null> {
        return this.userRepository.findOne({
            relations: { patreonAccount: true },
            where: {
                username: username,
                enabled: true,
            },
        })
    }

    async findByConfirmationToken(token: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: {
                confirmationToken: token,
            },
        })
    }

    userHasPlayedTheGame(user: User, game: Game): Promise<User | null> {
        return this.userRepository
            .createQueryBuilder('user')
            .innerJoin('user.games', 'game')
            .andWhere('game.id = :gameId', { gameId: game.id })
            .andWhere('user.id = :id', { id: user.id })
            .getOne()
    }
}
