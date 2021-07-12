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

@Module({
  imports: [
    ConfigModule.forRoot({
        isGlobal: true
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
