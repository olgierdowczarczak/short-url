/// <reference types="vite/client" />
import { DataSource, type MigrationInterface } from 'typeorm';
import { loadEnvFiles, getNodeEnv } from '../src/config/env-files.js';
import { envSchema } from '../src/config/env.schema.js';
import { buildTypeOrmOptions } from '../src/config/typeorm.config.js';
import { Link } from '../src/links/link.entity.js';

const migrationModules = import.meta.glob<
  Record<string, new () => MigrationInterface>
>('../src/migrations/*.ts', { eager: true });

export const setup = async () => {
  if (getNodeEnv() !== 'test') {
    throw new Error('Wrong NODE_ENV was set! Please use test environment');
  }

  loadEnvFiles();

  const env = envSchema.parse(process.env);
  if (!env.DB_NAME.endsWith('_test')) {
    throw new Error("DB_NAME should end with '_test'");
  }

  const dataSource = new DataSource({
    ...buildTypeOrmOptions(env),
    entities: [Link],
    migrations: Object.values(migrationModules).flatMap((migrationModule) =>
      Object.values(migrationModule),
    ),
  });

  await dataSource.initialize();
  try {
    await dataSource.dropDatabase();
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
};
