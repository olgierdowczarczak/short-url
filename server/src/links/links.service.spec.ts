import { QueryFailedError } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { LinksService } from './links.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Link } from './link.entity.js';

describe('LinksService', () => {
  let service: LinksService;
  let repository: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
  };
  const createQueryFailedError = (errorMessage: string, errorCode: string) =>
    new QueryFailedError(
      errorMessage,
      [],
      Object.assign(new Error(errorMessage), { code: errorCode }),
    );
  const duplicationError = createQueryFailedError(
    'duplicate key value violates unique constraint',
    '23505',
  );
  const unexpectedError = createQueryFailedError('not_null_violation', '23502');
  const links: Link[] = [
    {
      id: 1,
      code: 'qwertyui',
      url: 'https://example1.com',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 2,
      code: 'asdfghjk',
      url: 'https://example2.com',
      createdAt: new Date('2026-01-02T00:00:00Z'),
    },
  ];

  beforeEach(async () => {
    repository = {
      create: vi.fn((data) => data),
      save: vi.fn(),
      find: vi.fn(),
      findOneBy: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: getRepositoryToken(Link), useValue: repository },
        LinksService,
      ],
    }).compile();

    service = module.get<LinksService>(LinksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const id = 1;
    const code = 'qwertyui';
    const url = 'https://example.com';
    const createdAt = new Date('2026-01-01T00:00:00Z');
    const savedLink = { id, code, url, createdAt };

    it('should create a new link', async () => {
      const regexPattern = /^[A-Za-z0-9_-]{8}$/;
      repository.save.mockResolvedValueOnce(savedLink);

      const result = await service.create(url);

      expect(result).toStrictEqual(savedLink);
      expect(repository.create).toHaveBeenCalledOnce();
      expect(repository.create).toHaveBeenCalledWith({
        code: expect.stringMatching(regexPattern),
        url,
      });
      expect(repository.save).toHaveBeenCalledOnce();
    });

    it('should create a new link when duplication error appears', async () => {
      repository.save
        .mockRejectedValueOnce(duplicationError)
        .mockResolvedValueOnce(savedLink);

      const result = await service.create(url);

      expect(result).toStrictEqual(savedLink);
      expect(repository.create).toHaveBeenCalledTimes(2);
      const [[firstAttempt], [secondAttempt]] = repository.create.mock.calls;
      expect(secondAttempt.code).not.toBe(firstAttempt.code);
      expect(repository.save).toHaveBeenCalledTimes(2);
    });

    it('should throw InternalServerErrorException after 3 collisions', async () => {
      const maxAttempts = 3;
      repository.save.mockRejectedValue(duplicationError);

      const result = await service.create(url).catch((error) => error);

      expect(result).toBeInstanceOf(InternalServerErrorException);
      expect(repository.create).toHaveBeenCalledTimes(maxAttempts);
      expect(repository.save).toHaveBeenCalledTimes(maxAttempts);
    });

    it('should rethrow other database errors without retrying', async () => {
      repository.save.mockRejectedValue(unexpectedError);

      const result = await service.create(url).catch((error) => error);

      expect(result).toStrictEqual(unexpectedError);
      expect(repository.create).toHaveBeenCalledOnce();
      expect(repository.save).toHaveBeenCalledOnce();
    });
  });

  describe('findAll', () => {
    it('should return list with links', async () => {
      repository.find.mockResolvedValue(links);

      const result = await service.findAll();

      expect(result).toStrictEqual(links);
      expect(repository.find).toHaveBeenCalledOnce();
    });

    it('should return empty list when there are no links', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toStrictEqual([]);
      expect(repository.find).toHaveBeenCalledOnce();
    });
  });

  describe('findByCode', () => {
    it('should return link when it exists', async () => {
      const code = 'qwertyui';
      repository.findOneBy.mockResolvedValue(links[0]);

      const result = await service.findByCode(code);

      expect(result).toStrictEqual(links[0]);
      expect(repository.findOneBy).toHaveBeenCalledWith({ code });
      expect(repository.findOneBy).toHaveBeenCalledOnce();
    });

    it('should throw NotFoundException when link does not exist', async () => {
      const code = 'zxcvbnmm';
      repository.findOneBy.mockResolvedValue(null);

      const result = await service.findByCode(code).catch((error) => error);

      expect(result).toBeInstanceOf(NotFoundException);
      expect(result.message).toStrictEqual(`Link with code ${code} not found`);
      expect(repository.findOneBy).toHaveBeenCalledOnce();
    });
  });
});
