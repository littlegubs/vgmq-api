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
    ManyToOne,
} from 'typeorm'

import { Game } from '../games/entity/game.entity'
import { LobbyUser } from '../lobbies/entities/lobby-user.entity'
import { CharacterSkin } from '../skins/entities/character-skin.entity'
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

    @Column({ type: 'varchar', nullable: true })
    resetPasswordToken: string | null

    @Column({ type: 'varchar', nullable: true })
    banReason: string | null

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'bannedById' })
    bannedBy?: User | null

    @Column({ type: 'datetime', nullable: true })
    resetPasswordTokenCreatedAt: Date | null

    @ManyToMany(() => Game, (game) => game.users)
    @JoinTable({ name: 'user_games' })
    games: Game[]

    @ManyToMany(() => CharacterSkin, (characterSkin) => characterSkin.users)
    @JoinTable({ name: 'user_character_skins' })
    characterSkins: CharacterSkin[]

    @OneToOne(() => CharacterSkin)
    @JoinColumn()
    selectedCharacterSkin?: CharacterSkin

    @OneToOne(() => LobbyUser, (lobbyUser) => lobbyUser.user, { onDelete: 'SET NULL' })
    currentLobby?: LobbyUser

    @Column()
    @CreateDateColumn()
    createdAt: Date

    @Column()
    @UpdateDateColumn()
    updatedAt: Date

    @BeforeInsert() async hashPassword(): Promise<void> {
        this.password = await bcrypt.hash(this.password, 8)
    }

    async validatePassword(password: string): Promise<boolean> {
        return bcrypt.compare(password, this.password)
    }
}
