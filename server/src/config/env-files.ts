import { join } from 'node:path';

// src/config and dist/config share the same depth, so this always points to server/
const SERVER_ROOT = join(import.meta.dirname, '..', '..');

export const getEnvFilePaths = (): string[] => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  return [`.env.${nodeEnv}.local`, `.env.${nodeEnv}`, '.env'].map((fileName) =>
    join(SERVER_ROOT, fileName),
  );
};
