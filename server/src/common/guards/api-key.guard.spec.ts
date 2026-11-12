import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard.js';
import type { Env } from '../../config/env.schema.js';

const API_KEY = 'a'.repeat(32);

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let configService: {
    get: ReturnType<typeof vi.fn>;
  };

  const createContext = (headers: Record<string, string | string[]>) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ headers }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    configService = {
      get: vi.fn().mockReturnValue(API_KEY),
    };

    guard = new ApiKeyGuard(
      configService as unknown as ConfigService<Env, true>,
    );
  });

  it('should allow the request when api key matches', () => {
    const context = createContext({ 'x-api-key': API_KEY });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException when header is missing', () => {
    const context = createContext({});

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when api key length differs', () => {
    const context = createContext({ 'x-api-key': 'b'.repeat(16) });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when api key does not match', () => {
    const context = createContext({ 'x-api-key': 'b'.repeat(32) });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when header is sent multiple times', () => {
    const context = createContext({ 'x-api-key': ['b'.repeat(32)] });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
