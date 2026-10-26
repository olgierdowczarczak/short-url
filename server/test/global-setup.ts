import { DataSource } from 'typeorm';
import { loadEnvFiles, getNodeEnv } from '../src/config/env-files.js';
import { envSchema } from '../src/config/env.schema.js';
import { buildTypeOrmOptions } from '../src/config/typeorm.config.js';
import { Link } from '../src/links/link.entity.js';
import { CreateLinks1793022581301 } from '../src/migrations/1793022581301-CreateLinks.js';

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
    migrations: [CreateLinks1793022581301],
  });

  await dataSource.initialize();
  try {
    await dataSource.dropDatabase();
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
};
