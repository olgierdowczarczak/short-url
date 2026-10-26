import type { DataSourceOptions } from 'typeorm';
import type { Env } from './env.schema.js';

type DatabaseEnv = Pick<
  Env,
  'DB_HOST' | 'DB_PORT' | 'DB_USERNAME' | 'DB_PASSWORD' | 'DB_NAME'
>;

export const buildTypeOrmOptions = (env: DatabaseEnv): DataSourceOptions => ({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  synchronize: false,
});
