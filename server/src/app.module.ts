import {
  ClassSerializerInterceptor,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { APP_PIPE, APP_INTERCEPTOR, RouterModule } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { type Env, envSchema } from './config/env.schema.js';
import { buildTypeOrmOptions } from './config/typeorm.config.js';
import { getEnvFilePaths } from './config/env-files.js';
import { LinksModule } from './links/links.module.js';
import { RedirectModule } from './redirect/redirect.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
      envFilePath: getEnvFilePaths(),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => ({
        ...buildTypeOrmOptions({
          DB_HOST: configService.get('DB_HOST', { infer: true }),
          DB_PORT: configService.get('DB_PORT', { infer: true }),
          DB_USERNAME: configService.get('DB_USERNAME', { infer: true }),
          DB_PASSWORD: configService.get('DB_PASSWORD', { infer: true }),
          DB_NAME: configService.get('DB_NAME', { infer: true }),
        }),
        autoLoadEntities: true,
      }),
    }),
    LinksModule,
    RedirectModule,
    RouterModule.register([
      {
        path: 'api',
        children: [LinksModule],
      },
    ]),
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule {}
