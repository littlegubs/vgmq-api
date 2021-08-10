import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  BeforeInsert,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import slugify from 'slugify';
import { Game } from './game.entity';

@Entity()
export class Cover extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  igdbId: string;

  @Column()
  imageId: string;

  @Column()
  height: number;

  @Column()
  width: number;

  @OneToOne(() => Game, (game) => game.cover)
  game: Game;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}
