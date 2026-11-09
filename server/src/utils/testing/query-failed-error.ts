import { QueryFailedError } from 'typeorm';

export const createQueryFailedError = (
  errorMessage: string,
  errorCode: string,
) =>
  new QueryFailedError(
    errorMessage,
    [],
    Object.assign(new Error(errorMessage), { code: errorCode }),
  );
