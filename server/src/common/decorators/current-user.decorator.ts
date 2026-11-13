import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ProtectedRequest } from '../../auth/types/protected-request.js';

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<ProtectedRequest>();
    return request.user;
  },
);
