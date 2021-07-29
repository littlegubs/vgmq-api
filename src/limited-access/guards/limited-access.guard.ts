import {Injectable, CanActivate, ExecutionContext, UnauthorizedException} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class LimitedAccessGuard implements CanActivate {
    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest();
        if(request.cookies['pote']) {
            return true;
        }
        throw new UnauthorizedException('This website is a work in progress. You are not allowed to create an account for now, please ask someone to get a limited access');
    }
}
