import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { Link } from '../src/links/link.entity.js';
import { User } from '../src/users/user.entity.js';
import { buildLink } from '../src/links/testing/link.fixtures.js';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Env } from '../src/config/env.schema.js';
import { getAccessToken } from './helpers/auth.js';

const CODE_PATTERN = /^[A-Za-z0-9_-]{8}$/;

describe('Links (e2e)', () => {
  let app: INestApplication<App>;
  let linksRepository: Repository<Link>;
  let usersRepository: Repository<User>;
  let bearerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    linksRepository = app.get(getRepositoryToken(Link));
    usersRepository = app.get(getRepositoryToken(User));
  });

  beforeEach(async () => {
    await linksRepository.clear();
    await usersRepository.clear();
    bearerToken = await getAccessToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/links', () => {
    it('should return an empty list when no links exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/links')
        .set('Authorization', `Bearer ${bearerToken}`);

      expect(response.statusCode).toBe(HttpStatus.OK);
      expect(response.body).toEqual([]);
    });

    it('should return links sorted from newest to oldest', async () => {
      const olderLink = buildLink({
        code: 'olderlnk',
        url: 'https://example1.com',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      const newerLink = buildLink({
        code: 'newerlnk',
        url: 'https://example2.com',
        createdAt: new Date('2026-01-02T00:00:00Z'),
      });
      await linksRepository.insert([olderLink, newerLink]);

      const response = await request(app.getHttpServer())
        .get('/api/links')
        .set('Authorization', `Bearer ${bearerToken}`);

      expect(response.statusCode).toBe(HttpStatus.OK);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toEqual({
        code: newerLink.code,
        url: newerLink.url,
        createdAt: newerLink.createdAt.toISOString(),
        clicks: newerLink.clicks,
        expiresAt: null,
      });
      expect(response.body[1]).toEqual({
        code: olderLink.code,
        url: olderLink.url,
        createdAt: olderLink.createdAt.toISOString(),
        clicks: olderLink.clicks,
        expiresAt: null,
      });
    });
  });

  describe('POST /api/links', () => {
    it('should create a link with a generated code', async () => {
      const url = 'https://example.com';

      const response = await request(app.getHttpServer())
        .post('/api/links')
        .send({ url })
        .set('Authorization', `Bearer ${bearerToken}`);

      expect(response.statusCode).toBe(HttpStatus.CREATED);
      expect(response.body).toEqual({
        code: expect.stringMatching(CODE_PATTERN),
        url,
        createdAt: expect.any(String),
        clicks: 0,
        expiresAt: null,
      });
      const savedLink = await linksRepository.findOneBy({
        code: response.body.code,
      });
      expect(savedLink?.url).toBe(url);
    });

    it('should generate a new code when the url is already shortened', async () => {
      const existingLink = buildLink();
      await linksRepository.insert(existingLink);

      const response = await request(app.getHttpServer())
        .post('/api/links')
        .send({ url: existingLink.url })
        .set('Authorization', `Bearer ${bearerToken}`);

      expect(response.statusCode).toBe(HttpStatus.CREATED);
      expect(response.body.code).toMatch(CODE_PATTERN);
      expect(response.body.code).not.toBe(existingLink.code);
      expect(await linksRepository.countBy({ url: existingLink.url })).toBe(2);
    });

    it.each([
      ['url is missing', {}],
      ['url is invalid', { url: 'example1' }],
      ['url uses a disallowed protocol', { url: 'ftp://example1.com' }],
      [
        'body contains unknown fields',
        { url: 'https://example.com', foo: 'bar' },
      ],
      [
        'expiresAt is in the past',
        { url: 'https://example.com', expiresAt: '2000-01-01T00:00:00.000Z' },
      ],
      [
        'expiresAt has invalid format',
        { url: 'https://example.com', expiresAt: 'qwerty' },
      ],
      ['expiresAt is a number', { url: 'https://example.com', expiresAt: 123 }],
    ])('should return 400 when %s', async (_, payload) => {
      const response = await request(app.getHttpServer())
        .post('/api/links')
        .send(payload)
        .set('Authorization', `Bearer ${bearerToken}`);

      expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(await linksRepository.count()).toBe(0);
    });

    it.each([
      ['expiresAt is in the future', '3000-01-01T00:00:00.000Z'],
      ['expiresAt is null', null],
    ])('should create a link when %s', async (_, expiresAt) => {
      const url = 'https://example.com';

      const response = await request(app.getHttpServer())
        .post('/api/links')
        .send({ url, expiresAt })
        .set('Authorization', `Bearer ${bearerToken}`);

      expect(response.statusCode).toBe(HttpStatus.CREATED);
      expect(response.body.expiresAt).toEqual(expiresAt);
      const savedLink = await linksRepository.findOneBy({
        code: response.body.code,
      });
      expect(savedLink?.expiresAt?.toISOString() ?? null).toBe(expiresAt);
    });

    it('should use the provided alias as the link code', async () => {
      const url = 'https://example.com';
      const alias = 'my-alias';

      const response = await request(app.getHttpServer())
        .post('/api/links')
        .send({ url, alias })
        .set('Authorization', `Bearer ${bearerToken}`);

      expect(response.statusCode).toBe(HttpStatus.CREATED);
      expect(response.body).toEqual({
        code: alias,
        url,
        createdAt: expect.any(String),
        clicks: 0,
        expiresAt: null,
      });
      const savedLink = await linksRepository.findOneBy({
        code: response.body.code,
      });
      expect(savedLink?.code).toBe(alias);
    });

    it('should return 409 when alias is already taken', async () => {
      const url = 'https://example.com';
      const alias = 'my-alias';
      const existingLink = buildLink({ url, code: alias });
      await linksRepository.insert(existingLink);

      const response = await request(app.getHttpServer())
        .post('/api/links')
        .send({ url, alias })
        .set('Authorization', `Bearer ${bearerToken}`);

      expect(response.statusCode).toBe(HttpStatus.CONFLICT);
      const linksCount = await linksRepository.count();
      expect(linksCount).toBe(1);
    });

    it('should create only one link when the same alias is requested concurrently', async () => {
      const url = 'https://example.com';
      const alias = 'my-alias';
      const createRequest = () =>
        request(app.getHttpServer())
          .post('/api/links')
          .send({ url, alias })
          .set('Authorization', `Bearer ${bearerToken}`);

      const requests = await Promise.all([createRequest(), createRequest()]);

      const responses = requests.sort((a, b) => a.statusCode - b.statusCode);
      expect(responses[0].statusCode).toBe(HttpStatus.CREATED);
      expect(responses[1].statusCode).toBe(HttpStatus.CONFLICT);
      const linksCount = await linksRepository.count();
      expect(linksCount).toBe(1);
    });

    it.each<[string, unknown]>([
      ['is shorter than 3 characters', 'ab'],
      ['is longer than 32 characters', 'a'.repeat(33)],
      ['is not a string', 123],
      ['contains invalid characters', '!@#$%^&*()'],
      ['is a reserved word', 'api'],
      ['is a reserved word in different casing', 'HEALTH'],
    ])('should return 400 when alias %s', async (_, alias) => {
      const url = 'https://example.com';

      const response = await request(app.getHttpServer())
        .post('/api/links')
        .send({ url, alias })
        .set('Authorization', `Bearer ${bearerToken}`);

      expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(await linksRepository.count()).toBe(0);
    });
  });

  describe('GET /api/links/:code', () => {
    it('should return the link with the given code', async () => {
      const existingLink = buildLink();
      await linksRepository.insert(existingLink);

      const response = await request(app.getHttpServer())
        .get(`/api/links/${existingLink.code}`)
        .set('Authorization', `Bearer ${bearerToken}`);

      expect(response.statusCode).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        code: existingLink.code,
        url: existingLink.url,
        createdAt: expect.any(String),
        clicks: existingLink.clicks,
        expiresAt: null,
      });
    });

    it('should return the link even when it has expired', async () => {
      const expiresAt = new Date('2000-01-01T00:00:00Z');
      const existingLink = buildLink({ expiresAt });
      await linksRepository.insert(existingLink);

      const response = await request(app.getHttpServer())
        .get(`/api/links/${existingLink.code}`)
        .set('Authorization', `Bearer ${bearerToken}`);

      expect(response.statusCode).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        code: existingLink.code,
        url: existingLink.url,
        createdAt: expect.any(String),
        clicks: existingLink.clicks,
        expiresAt: expiresAt.toISOString(),
      });
    });

    it('should return 404 when link does not exist', async () => {
      const code = 'qwertyop';

      const response = await request(app.getHttpServer())
        .get(`/api/links/${code}`)
        .set('Authorization', `Bearer ${bearerToken}`);

      expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
      expect(response.body.message).toBe(`Link with code ${code} not found`);
    });

    it('should not count a click when reading link details', async () => {
      const existingLink = buildLink();
      await linksRepository.insert(existingLink);
      const counterBeforeIncrement = existingLink.clicks;

      const response = await request(app.getHttpServer())
        .get(`/api/links/${existingLink.code}`)
        .set('Authorization', `Bearer ${bearerToken}`);

      expect(response.statusCode).toBe(HttpStatus.OK);
      const updatedLink = await linksRepository.findOneBy({
        code: existingLink.code,
      });
      expect(updatedLink?.clicks).toEqual(counterBeforeIncrement);
    });
  });

  describe('Authorization', () => {
    const endpoints = [
      ['get', '/api/links'],
      ['post', '/api/links'],
      ['get', '/api/links/somecode'],
    ] as const;

    const signToken = (secret: string, exp?: number) =>
      new JwtService({ secret }).sign({
        sub: 1,
        email: 'test@test.com',
        ...(exp !== undefined && { exp }),
      });

    const getJwtSecret = () =>
      app
        .get<ConfigService<Env, true>>(ConfigService)
        .get('JWT_SECRET', { infer: true });

    const invalidAuthorizations: [string, () => string | undefined][] = [
      ['authorization header is missing', () => undefined],
      ['scheme is not Bearer', () => `Basic ${bearerToken}`],
      ['token is malformed', () => 'Bearer not-a-jwt'],
      [
        'token is signed with a different secret',
        () => `Bearer ${signToken('x'.repeat(32))}`,
      ],
      [
        'token has expired',
        () =>
          `Bearer ${signToken(getJwtSecret(), Math.floor(Date.now() / 1000) - 10)}`,
      ],
    ];

    describe.each(endpoints)('%s %s', (method, path) => {
      it.each(invalidAuthorizations)(
        'should return 401 when %s',
        async (_, buildAuthorization) => {
          const authorization = buildAuthorization();
          const pendingRequest = request(app.getHttpServer())[method](path);

          const response = await (authorization
            ? pendingRequest.set('Authorization', authorization)
            : pendingRequest);

          expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);
          expect(await linksRepository.count()).toBe(0);
        },
      );
    });
  });

  describe('API prefix', () => {
    const endpoints = it.each([
      ['get', '/links'],
      ['post', '/links'],
      ['get', '/links/somecode'],
    ] as const);

    endpoints(
      'should return 404 for %s %s without /api prefix',
      async (method, path) => {
        const response = await request(app.getHttpServer())
          [method](path)
          .set('Authorization', `Bearer ${bearerToken}`);

        expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
      },
    );
  });
});
