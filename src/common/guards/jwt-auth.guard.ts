import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleRequest<TUser = any>(err: any, user: any, _info: any): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Missing or invalid token');
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return user;
  }
}
