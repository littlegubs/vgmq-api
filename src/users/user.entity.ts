import * as bcrypt from 'bcrypt'
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    BeforeInsert,
    CreateDateColumn,
    UpdateDateColumn,
    BaseEntity,
    ManyToMany,
    JoinTable,
} from 'typeorm'

import { Game } from '../games/entity/game.entity'

export enum UserRole {
    ADMIN = 'admin',
    USER = 'user',
}

@Entity()
export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ unique: true })
    username: string

    @Column({ unique: true })
    email: string

    @Column()
    password: string

    @Column({
        type: 'set',
        enum: UserRole,
        default: [UserRole.USER],
    })
    roles: string[]

    @Column({ default: true })
    enabled: boolean

    @Column({ type: 'varchar', nullable: true })
    currentHashedRefreshToken?: string | null

    @ManyToMany(() => Game, (game) => game.users)
    @JoinTable({ name: 'user_games' })
    games: Game[]

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
