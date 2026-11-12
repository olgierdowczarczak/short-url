import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './user.entity.js';
import { UsersService } from './users.service.js';
import { createQueryFailedError } from '../utils/testing/query-failed-error.js';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
  };

  const email = 'user@example.com';
  const passwordHash = '$argon2id$hash';
  const savedUser: User = {
    id: 1,
    email,
    passwordHash,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    usersRepository = {
      create: vi.fn((data) => data),
      save: vi.fn(),
      findOneBy: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: getRepositoryToken(User), useValue: usersRepository },
        UsersService,
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('should save a user with the given email and password hash', async () => {
      usersRepository.save.mockResolvedValueOnce(savedUser);

      const result = await service.create(email, passwordHash);

      expect(result).toBe(savedUser);
      expect(usersRepository.create).toHaveBeenCalledExactlyOnceWith({
        email,
        passwordHash,
      });
      expect(usersRepository.save).toHaveBeenCalledOnce();
    });

    it('should throw ConflictException when email is already taken', async () => {
      usersRepository.save.mockRejectedValueOnce(
        createQueryFailedError(
          'duplicate key value violates unique constraint',
          '23505',
        ),
      );

      const result = await service
        .create(email, passwordHash)
        .catch((error) => error);

      expect(result).toBeInstanceOf(ConflictException);
      expect(result.message).toBe(`User with email ${email} already exists`);
    });

    it('should rethrow other database errors', async () => {
      const unexpectedError = createQueryFailedError(
        'not_null_violation',
        '23502',
      );
      usersRepository.save.mockRejectedValueOnce(unexpectedError);

      const result = await service
        .create(email, passwordHash)
        .catch((error) => error);

      expect(result).toBe(unexpectedError);
    });
  });

  describe('findByEmail', () => {
    it('should return the user when email exists', async () => {
      usersRepository.findOneBy.mockResolvedValueOnce(savedUser);

      const result = await service.findByEmail(email);

      expect(result).toBe(savedUser);
      expect(usersRepository.findOneBy).toHaveBeenCalledExactlyOnceWith({
        email,
      });
    });

    it('should return null when email does not exist', async () => {
      usersRepository.findOneBy.mockResolvedValueOnce(null);

      const result = await service.findByEmail(email);

      expect(result).toBeNull();
    });
  });
});
