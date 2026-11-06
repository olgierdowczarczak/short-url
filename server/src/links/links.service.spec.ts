import { QueryFailedError } from 'typeorm';
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

describe('LinksService', () => {
  let service: LinksService;
  let linksRepository: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    increment: ReturnType<typeof vi.fn>;
  };
  const createQueryFailedError = (errorMessage: string, errorCode: string) =>
    new QueryFailedError(
      errorMessage,
      [],
      Object.assign(new Error(errorMessage), { code: errorCode }),
    );

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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const url = 'https://example.com';
    const createdLink = buildLink({ url });

    it('should create a new link', async () => {
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

    it('should create a new link when duplication error appears', async () => {
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

    it('should throw InternalServerErrorException after 3 collisions', async () => {
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

    it('should create a new link with alias', async () => {
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

    it('should throw ConflictException when alias is already taken', async () => {
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

    it('should rethrow other database errors when creating link with alias', async () => {
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
    it('should return list with links', async () => {
      linksRepository.find.mockResolvedValue(links);

      const result = await service.findAll();

      expect(result).toBe(links);
      expect(linksRepository.find).toHaveBeenCalledExactlyOnceWith({
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty list when there are no links', async () => {
      linksRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toStrictEqual([]);
      expect(linksRepository.find).toHaveBeenCalledOnce();
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

    it('should increment clicks for existing link', async () => {
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
  });
});
