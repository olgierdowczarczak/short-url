import { existsSync } from 'node:fs';
import { join } from 'node:path';

// src/config and dist/config share the same depth, so this always points to server/
const SERVER_ROOT = join(import.meta.dirname, '..', '..');

export const getNodeEnv = () => process.env.NODE_ENV ?? 'development';

export const getEnvFilePaths = (): string[] => {
  const nodeEnv = getNodeEnv();
  return [`.env.${nodeEnv}.local`, `.env.${nodeEnv}`, '.env'].map((fileName) =>
    join(SERVER_ROOT, fileName),
  );
};

export const loadEnvFiles = () => {
  for (const filePath of getEnvFilePaths()) {
    if (existsSync(filePath)) {
      process.loadEnvFile(filePath);
    }
  }
};
