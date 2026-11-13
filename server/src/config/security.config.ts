import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { Env } from './env.schema.js';

export const setupSecurity = (app: INestApplication) => {
  const origin = app
    .get<ConfigService<Env, true>>(ConfigService)
    .get('CORS_ORIGINS', { infer: true })
    .split(',');

  app.use(helmet());
  app.enableCors({
    origin,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
};
