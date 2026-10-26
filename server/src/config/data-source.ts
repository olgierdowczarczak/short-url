import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { DataSource } from 'typeorm';
import { envSchema } from './env.schema.js';
import { getEnvFilePaths } from './env-files.js';
import { buildTypeOrmOptions } from './typeorm.config.js';
import { Link } from '../links/link.entity.js';

for (const filePath of getEnvFilePaths()) {
  if (existsSync(filePath)) {
    process.loadEnvFile(filePath);
  }
}

const env = envSchema.parse(process.env);
export default new DataSource({
  ...buildTypeOrmOptions(env),
  entities: [Link],
  migrations: [join(import.meta.dirname, '..', 'migrations', '*.js')],
});
