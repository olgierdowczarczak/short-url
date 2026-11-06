import { QueryFailedError } from 'typeorm';

export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError && error.driverError.code === '23505'
  );
}
