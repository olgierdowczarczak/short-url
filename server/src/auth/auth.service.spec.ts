import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import type { User } from '../users/user.entity.js';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    create: ReturnType<typeof vi.fn>;
    findByEmail: ReturnType<typeof vi.fn>;
  };
  let jwtService: { signAsync: ReturnType<typeof vi.fn> };

  const email = 'user@example.com';
  const password = 'zaq1@WSX';

  beforeEach(async () => {
    usersService = { create: vi.fn(), findByEmail: vi.fn() };
    jwtService = { signAsync: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        AuthService,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    await service.onModuleInit();
  });

  describe('register', () => {
    it('should hash the password with argon2 before creating the user', async () => {
      const createdUser = { id: 1, email } as User;
      usersService.create.mockResolvedValueOnce(createdUser);

      const result = await service.register({ email, password });

      expect(result).toBe(createdUser);
      expect(usersService.create).toHaveBeenCalledOnce();
      const [passedEmail, passedHash] = usersService.create.mock.calls[0];
      expect(passedEmail).toBe(email);
      expect(passedHash).not.toBe(password);
      expect(await argon2.verify(passedHash, password)).toBe(true);
    });
  });

  describe('login', () => {
    let user: User;

    beforeEach(async () => {
      user = {
        id: 1,
        email,
        passwordHash: await argon2.hash(password),
        createdAt: new Date('2026-01-01T00:00:00Z'),
      };
    });

    it('should sign an access token with user id and email when credentials are valid', async () => {
      usersService.findByEmail.mockResolvedValueOnce(user);
      jwtService.signAsync.mockResolvedValueOnce('signed-token');

      const result = await service.login({ email, password });

      expect(result).toEqual({ accessToken: 'signed-token' });
      expect(usersService.findByEmail).toHaveBeenCalledExactlyOnceWith(email);
      expect(jwtService.signAsync).toHaveBeenCalledExactlyOnceWith({
        sub: user.id,
        email: user.email,
      });
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      usersService.findByEmail.mockResolvedValueOnce(null);

      const result = await service
        .login({ email, password })
        .catch((error) => error);

      expect(result).toBeInstanceOf(UnauthorizedException);
      expect(result.message).toBe('Invalid credentials');
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      usersService.findByEmail.mockResolvedValueOnce(user);

      const result = await service
        .login({ email, password: 'wrong_password' })
        .catch((error) => error);

      expect(result).toBeInstanceOf(UnauthorizedException);
      expect(result.message).toBe('Invalid credentials');
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });
});
