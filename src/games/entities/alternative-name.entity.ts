import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  BeforeInsert,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  ManyToOne,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import slugify from 'slugify';
import { Game } from './game.entity';

@Entity()
export class AlternativeName extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  igdbId: string;

  @Column()
  name: string;

  @Column({ default: true })
  enabled: boolean;

  @ManyToOne(() => Game, (game) => game.alternativeNames)
  game: Game;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}
