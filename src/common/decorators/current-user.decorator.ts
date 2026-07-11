import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

type AuthenticatedRequest = {
  user: Omit<User, 'password'>;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Omit<User, 'password'> => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
