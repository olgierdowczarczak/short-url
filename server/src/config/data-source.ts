import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { DataSource } from 'typeorm';
import { envSchema } from './env.schema.js';
import { buildTypeOrmOptions } from './typeorm.config.js';
import { Link } from '../links/link.entity.js';

const ENV_PATH = join(import.meta.dirname, '..', '..', '.env');
if (existsSync(ENV_PATH)) {
  process.loadEnvFile(ENV_PATH);
}

const env = envSchema.parse(process.env);
export default new DataSource({
  ...buildTypeOrmOptions(env),
  entities: [Link],
  migrations: [join(import.meta.dirname, '..', 'migrations', '*.js')],
});
