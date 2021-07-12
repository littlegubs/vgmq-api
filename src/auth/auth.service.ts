import {Injectable, UnauthorizedException} from '@nestjs/common';
import {UsersService} from '../users/users.service';
import {JwtService} from '@nestjs/jwt';
import {ConfigService} from '@nestjs/config';
import {AuthLoginDto} from "./auth-login.dto";
import {User} from "../users/user.entity";
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) {}

    public getJwtAccessToken(payload: object) {
        return this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
            expiresIn: `1h`
        });
    }

    public getJwtRefreshToken(payload: object) {
        return this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_REFRESH_TOKEN_SECRET'),
            expiresIn: `30d`
        });
    }

    async login(authLoginDto: AuthLoginDto) {
        const user = await this.validateUser(authLoginDto);
        const payload = {
            userId: user.id,
        };
        const refreshToken = this.getJwtRefreshToken(payload);
        const currentHashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        await User.update(user.id, {
            currentHashedRefreshToken: currentHashedRefreshToken
        });

        return {
            access_token: this.getJwtAccessToken(payload),
            refresh_token: refreshToken,
        };
    }

    async validateUser(authLoginDto: AuthLoginDto): Promise<User> {
        const { username, password } = authLoginDto;

        const user = await this.usersService.findByUsername(username);
        if (!(await user?.validatePassword(password))) {
            throw new UnauthorizedException();
        }

        return user;
    }

    async getUserIfRefreshTokenMatches(refreshToken: string, userId: number) {
        const user = await this.usersService.findById(userId);

        const isRefreshTokenMatching = await bcrypt.compare(
            refreshToken,
            user.currentHashedRefreshToken
        );

        if (isRefreshTokenMatching) {
            return user;
        }
    }
}
