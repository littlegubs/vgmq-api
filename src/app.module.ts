import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {TypeOrmModule} from "@nestjs/typeorm";
import { UsersModule } from './users/users.module';
import {User} from "./users/user.entity";
import { AuthModule } from './auth/auth.module';
import {ConfigModule, ConfigService} from "@nestjs/config";
import {PassportModule} from "@nestjs/passport";
import {JwtModule} from "@nestjs/jwt";
import { LimitedAccessModule } from './limited-access/limited-access.module';
import { GamesModule } from './games/games.module';
import * as Joi from "joi";

@Module({
  imports: [
    ConfigModule.forRoot({
        isGlobal: true,
        validationSchema: Joi.object({
            ENV: Joi.string()
                .valid('dev', 'prod')
                .default('dev'),
        })
    }),
      TypeOrmModule.forRoot({
            type: 'mysql',
            host:process.env.DATABASE_HOST,
            port: parseInt(process.env.DATABASE_PORT),
            username:process.env.DATABASE_USERNAME,
            password:process.env.DATABASE_PASSWORD,
            logging: true,
            database:process.env.DATABASE_NAME,
            synchronize: true, // dev only
            autoLoadEntities: true,
  }),
    UsersModule,
    AuthModule,
    LimitedAccessModule,
    GamesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
