import { timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Env } from '../../config/env.schema.js';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers['x-api-key'];
    if (typeof header !== 'string') {
      throw new UnauthorizedException();
    }

    const apiKey = this.configService.get('API_KEY', { infer: true });
    const headerBuffer = Buffer.from(header);
    const apiKeyBuffer = Buffer.from(apiKey);
    if (
      headerBuffer.length !== apiKeyBuffer.length ||
      !timingSafeEqual(headerBuffer, apiKeyBuffer)
    ) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
