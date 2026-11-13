import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { AuthUser } from '../types/auth-user.js';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
import type { JwtPayload } from '../types/jwt-payload.js';

describe('JwtAuthGuard', () => {
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };
  let jwtService: { verifyAsync: ReturnType<typeof vi.fn> };
  let guard: JwtAuthGuard;

  const handler = () => {};
  const controllerClass = class TestController {};
  const createContext = (headers: Record<string, string> = {}) => {
    const request: { headers: Record<string, string>; user?: AuthUser } = {
      headers,
    };
    const context = {
      getHandler: () => handler,
      getClass: () => controllerClass,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { context, request };
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn() };
    jwtService = { verifyAsync: vi.fn() };
    guard = new JwtAuthGuard(
      reflector as unknown as Reflector,
      jwtService as unknown as JwtService,
    );
  });

  it('should allow public routes without verifying a token', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true);
    const { context } = createContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledExactlyOnceWith(
      IS_PUBLIC_KEY,
      [handler, controllerClass],
    );
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when authorization header is missing', async () => {
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it.each([
    ['uses a different scheme', 'Basic abc'],
    ['uses a lowercase bearer scheme', 'bearer abc'],
  ])(
    'should throw UnauthorizedException when authorization header %s',
    async (_, authorization) => {
      const { context } = createContext({ authorization });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    },
  );

  it('should throw UnauthorizedException when bearer token is empty', async () => {
    const { context } = createContext({ authorization: 'Bearer ' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when token verification fails', async () => {
    jwtService.verifyAsync.mockRejectedValueOnce(new Error('jwt expired'));
    const { context } = createContext({
      authorization: 'Bearer valid.jwt.token',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should attach the authenticated user to the request when token is valid', async () => {
    const user: JwtPayload = { sub: 1, email: 'example@example.com' };
    jwtService.verifyAsync.mockResolvedValueOnce(user);
    const token = 'valid.jwt.token';
    const { context, request } = createContext({
      authorization: `Bearer ${token}`,
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual({
      id: user.sub,
      email: user.email,
    });
    expect(jwtService.verifyAsync).toHaveBeenCalledExactlyOnceWith(token);
  });
});
