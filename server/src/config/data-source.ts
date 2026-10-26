import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { envSchema } from './env.schema.js';
import { buildTypeOrmOptions } from './typeorm.config.js';
import { Link } from '../links/link.entity.js';

process.loadEnvFile();
const env = envSchema.parse(process.env);
export default new DataSource({
  ...buildTypeOrmOptions(env),
  entities: [Link],
  migrations: [join(import.meta.dirname, '..', 'migrations', '*.js')],
});
