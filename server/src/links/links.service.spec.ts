import { Test, TestingModule } from '@nestjs/testing';
import { LinksService } from './links.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  GoneException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Link } from './link.entity.js';
import { buildLink, links } from './testing/link.fixtures.js';
import { createQueryFailedError } from '../utils/testing/query-failed-error.js';

describe('LinksService', () => {
  let service: LinksService;
  let linksRepository: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    increment: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    linksRepository = {
      create: vi.fn((data) => data),
      save: vi.fn(),
      find: vi.fn(),
      findOneBy: vi.fn(),
      increment: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: getRepositoryToken(Link), useValue: linksRepository },
        LinksService,
      ],
    }).compile();

    service = module.get<LinksService>(LinksService);
  });

  describe('create', () => {
    const url = 'https://example.com';
    const createdLink = buildLink({ url });

    it('should save a link with a generated 8-character code', async () => {
      const regexPattern = /^[A-Za-z0-9_-]{8}$/;
      linksRepository.save.mockResolvedValueOnce(createdLink);

      const result = await service.create({ url });

      expect(result).toBe(createdLink);
      expect(linksRepository.create).toHaveBeenCalledExactlyOnceWith({
        code: expect.stringMatching(regexPattern),
        url,
      });
      expect(linksRepository.save).toHaveBeenCalledOnce();
    });

    it('should pass expiresAt to the repository', async () => {
      const expiresAt = new Date('2099-01-01T00:00:00Z');
      linksRepository.save.mockResolvedValueOnce(createdLink);

      await service.create({ url, expiresAt });

      expect(linksRepository.create).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ expiresAt }),
      );
    });

    it('should retry with a new code when the generated code collides', async () => {
      const duplicationError = createQueryFailedError(
        'duplicate key value violates unique constraint',
        '23505',
      );
      linksRepository.save
        .mockRejectedValueOnce(duplicationError)
        .mockResolvedValueOnce(createdLink);

      const result = await service.create({ url });

      expect(result).toBe(createdLink);
      expect(linksRepository.create).toHaveBeenCalledTimes(2);
      const [[firstAttempt], [secondAttempt]] =
        linksRepository.create.mock.calls;
      expect(secondAttempt.code).not.toBe(firstAttempt.code);
      expect(linksRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should throw InternalServerErrorException after 3 consecutive collisions', async () => {
      const maxAttempts = 3;
      const duplicationError = createQueryFailedError(
        'duplicate key value violates unique constraint',
        '23505',
      );
      linksRepository.save.mockRejectedValue(duplicationError);

      const result = await service.create({ url }).catch((error) => error);

      expect(result).toBeInstanceOf(InternalServerErrorException);
      expect(linksRepository.create).toHaveBeenCalledTimes(maxAttempts);
      expect(linksRepository.save).toHaveBeenCalledTimes(maxAttempts);
    });

    it('should rethrow other database errors without retrying', async () => {
      const unexpectedError = createQueryFailedError(
        'not_null_violation',
        '23502',
      );
      linksRepository.save.mockRejectedValue(unexpectedError);

      const result = await service.create({ url }).catch((error) => error);

      expect(result).toBe(unexpectedError);
      expect(linksRepository.create).toHaveBeenCalledOnce();
      expect(linksRepository.save).toHaveBeenCalledOnce();
    });

    it('should use the alias as the link code', async () => {
      const alias = 'my-alias';
      linksRepository.save.mockResolvedValueOnce(createdLink);

      const result = await service.create({ url, alias });

      expect(result).toBe(createdLink);
      expect(linksRepository.create).toHaveBeenCalledExactlyOnceWith({
        code: alias,
        url,
      });
      expect(linksRepository.save).toHaveBeenCalledOnce();
    });

    it('should throw ConflictException without retrying when alias is already taken', async () => {
      const alias = 'my-alias';
      const duplicationError = createQueryFailedError(
        'duplicate key value violates unique constraint',
        '23505',
      );
      linksRepository.save.mockRejectedValueOnce(duplicationError);

      const result = await service
        .create({ url, alias })
        .catch((error) => error);

      expect(result).toBeInstanceOf(ConflictException);
      expect(result.message).toBe(`Alias ${alias} is already taken`);
      expect(linksRepository.create).toHaveBeenCalledExactlyOnceWith({
        code: alias,
        url,
      });
      expect(linksRepository.save).toHaveBeenCalledOnce();
    });

    it('should rethrow other database errors when alias is provided', async () => {
      const alias = 'my-alias';
      const unexpectedError = createQueryFailedError(
        'not_null_violation',
        '23502',
      );
      linksRepository.save.mockRejectedValueOnce(unexpectedError);

      const result = await service
        .create({ url, alias })
        .catch((error) => error);

      expect(result).toBe(unexpectedError);
      expect(linksRepository.create).toHaveBeenCalledExactlyOnceWith({
        code: alias,
        url,
      });
      expect(linksRepository.save).toHaveBeenCalledOnce();
    });
  });

  describe('findAll', () => {
    it('should return links ordered from newest to oldest', async () => {
      linksRepository.find.mockResolvedValue(links);

      const result = await service.findAll();

      expect(result).toBe(links);
      expect(linksRepository.find).toHaveBeenCalledExactlyOnceWith({
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findByCode', () => {
    it('should return link when it exists', async () => {
      const code = 'qwertyui';
      linksRepository.findOneBy.mockResolvedValue(links[0]);

      const result = await service.findByCode(code);

      expect(result).toBe(links[0]);
      expect(linksRepository.findOneBy).toHaveBeenCalledExactlyOnceWith({
        code,
      });
    });

    it('should throw NotFoundException when link does not exist', async () => {
      const code = 'zxcvbnmm';
      linksRepository.findOneBy.mockResolvedValue(null);

      const result = await service.findByCode(code).catch((error) => error);

      expect(result).toBeInstanceOf(NotFoundException);
      expect(result.message).toStrictEqual(`Link with code ${code} not found`);
      expect(linksRepository.findOneBy).toHaveBeenCalledExactlyOnceWith({
        code,
      });
    });
  });

  describe('resolveRedirect', () => {
    const now = new Date('2026-01-01T00:00:00Z');

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(now);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should increment clicks when link has no expiration date', async () => {
      const code = 'qwertyui';
      linksRepository.increment.mockResolvedValue(undefined);
      linksRepository.findOneBy.mockResolvedValue(links[0]);

      const result = await service.resolveRedirect(code);

      expect(result).toBe(links[0]);
      expect(linksRepository.increment).toHaveBeenCalledExactlyOnceWith(
        { code },
        'clicks',
        1,
      );
    });

    it('should increment clicks when link expires in the future', async () => {
      const link = buildLink({ expiresAt: new Date(now.getTime() + 1000) });
      linksRepository.findOneBy.mockResolvedValue(link);

      const result = await service.resolveRedirect(link.code);

      expect(result).toBe(link);
      expect(linksRepository.increment).toHaveBeenCalledExactlyOnceWith(
        { code: link.code },
        'clicks',
        1,
      );
    });

    it('should throw GoneException when link has already expired', async () => {
      const link = buildLink({ expiresAt: new Date(now.getTime() - 1000) });
      linksRepository.findOneBy.mockResolvedValue(link);

      const result = await service
        .resolveRedirect(link.code)
        .catch((error) => error);

      expect(result).toBeInstanceOf(GoneException);
      expect(linksRepository.increment).not.toHaveBeenCalled();
    });

    it('should throw GoneException when link expires exactly now', async () => {
      const link = buildLink({ expiresAt: now });
      linksRepository.findOneBy.mockResolvedValue(link);

      const result = await service
        .resolveRedirect(link.code)
        .catch((error) => error);

      expect(result).toBeInstanceOf(GoneException);
      expect(linksRepository.increment).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException without counting a click when link does not exist', async () => {
      linksRepository.findOneBy.mockResolvedValue(null);

      const result = await service
        .resolveRedirect('missing1')
        .catch((error) => error);

      expect(result).toBeInstanceOf(NotFoundException);
      expect(linksRepository.increment).not.toHaveBeenCalled();
    });
  });
});
