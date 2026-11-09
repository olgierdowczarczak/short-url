import { Test, TestingModule } from '@nestjs/testing';
import argon2 from 'argon2';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import type { User } from '../users/user.entity.js';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { create: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    usersService = { create: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: UsersService, useValue: usersService },
        AuthService,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should create user with hashed password', async () => {
      const email = 'user@example.com';
      const password = 'zaq1@WSX';
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
});
