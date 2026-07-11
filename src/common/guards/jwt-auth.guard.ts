import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser | false | null | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _info: unknown,
  ): TUser {
    if (err) {
      throw err;
    }

    if (!user) {
      throw new UnauthorizedException('Missing or invalid token');
    }

    return user;
  }
}
