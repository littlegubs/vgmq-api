import * as bcrypt from 'bcrypt'
import { Exclude, Expose } from 'class-transformer'
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    BeforeInsert,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToMany,
    JoinTable,
    OneToOne,
    JoinColumn,
} from 'typeorm'

import { Game } from '../games/entity/game.entity'
import { LobbyUser } from '../lobbies/entities/lobby-user.entity'
import { Role } from './role.enum'

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Expose({ groups: ['wsLobby'] })
    @Column({ unique: true })
    username: string

    @Column({ unique: true })
    email: string

    @Column()
    @Exclude()
    password: string

    @Column({
        type: 'set',
        enum: Role,
        default: [Role.User],
    })
    roles: string[]

    @Column({ default: false })
    enabled: boolean

    @Column({ type: 'varchar', length: 40, nullable: true })
    confirmationToken: string | null

    @Column({ type: 'varchar', nullable: true })
    currentHashedRefreshToken?: string | null

    @ManyToMany(() => Game, (game) => game.users)
    @JoinTable({ name: 'user_games' })
    games: Game[]

    @OneToOne(() => LobbyUser, (lobbyUser) => lobbyUser.user, { onDelete: 'SET NULL' })
    @JoinColumn()
    currentLobby?: LobbyUser

    @Column()
    @CreateDateColumn()
    createdAt: Date

    @Column()
    @UpdateDateColumn()
    updatedAt: Date

    @BeforeInsert() async hashPassword() {
        this.password = await bcrypt.hash(this.password, 8)
    }

    async validatePassword(password: string): Promise<boolean> {
        return bcrypt.compare(password, this.password)
    }
}
