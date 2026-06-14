import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SafeUser } from '../../modules/auth/auth.service';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SafeUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
