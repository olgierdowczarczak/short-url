import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { Link } from '../src/links/link.entity.js';
import { buildLink } from '../src/links/testing/link.fixtures.js';
import type { Env } from '../src/config/env.schema.js';

const CODE_PATTERN = /^[A-Za-z0-9_-]{8}$/;

describe('Links (e2e)', () => {
  let app: INestApplication<App>;
  let linksRepository: Repository<Link>;
  let apiKey: string;

  const modulePath = '/links';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    linksRepository = app.get(getRepositoryToken(Link));
    apiKey = app
      .get<ConfigService<Env, true>>(ConfigService)
      .get('API_KEY', { infer: true });
  });

  beforeEach(async () => {
    await linksRepository.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  describe(`GET ${modulePath}`, () => {
    it('should return an empty list when there are no links', async () => {
      const response = await request(app.getHttpServer())
        .get(modulePath)
        .set('x-api-key', apiKey);

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
        .get(modulePath)
        .set('x-api-key', apiKey);

      expect(response.statusCode).toBe(HttpStatus.OK);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({
        code: newerLink.code,
        url: newerLink.url,
      });
      expect(response.body[1]).toMatchObject({
        code: olderLink.code,
        url: olderLink.url,
      });
    });
  });

  describe(`POST ${modulePath}`, () => {
    it('should create a link', async () => {
      const url = 'https://example.com';

      const response = await request(app.getHttpServer())
        .post(modulePath)
        .send({ url })
        .set('x-api-key', apiKey);

      expect(response.statusCode).toBe(HttpStatus.CREATED);
      expect(response.body).toMatchObject({
        code: expect.stringMatching(CODE_PATTERN),
        url,
      });
      const savedLink = await linksRepository.findOneBy({
        code: response.body.code,
      });
      expect(savedLink?.url).toBe(url);
    });

    it('should create a new code for an already shortened url', async () => {
      const existingLink = buildLink();
      await linksRepository.insert(existingLink);

      const response = await request(app.getHttpServer())
        .post(modulePath)
        .send({ url: existingLink.url })
        .set('x-api-key', apiKey);

      expect(response.statusCode).toBe(HttpStatus.CREATED);
      expect(response.body.code).toMatch(CODE_PATTERN);
      expect(response.body.code).not.toBe(existingLink.code);
      expect(await linksRepository.countBy({ url: existingLink.url })).toBe(2);
    });

    it.each([
      ['url is not provided', {}],
      ['url is not valid', { url: 'example1' }],
      ['url contains unallowed protocol', { url: 'ftp://example1.com' }],
      [
        'request contains additional fields',
        { url: 'https://example.com', foo: 'bar' },
      ],
    ])('should return 400 when %s', async (_, payload) => {
      const response = await request(app.getHttpServer())
        .post(modulePath)
        .send(payload)
        .set('x-api-key', apiKey);

      expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(await linksRepository.count()).toBe(0);
    });
  });

  describe(`GET ${modulePath}/:code`, () => {
    it('should return link when link with provided code exists', async () => {
      const existingLink = buildLink();
      await linksRepository.insert(existingLink);

      const response = await request(app.getHttpServer())
        .get(`${modulePath}/${existingLink.code}`)
        .set('x-api-key', apiKey);

      expect(response.statusCode).toBe(HttpStatus.OK);
      expect(response.body).toMatchObject({
        code: existingLink.code,
        url: existingLink.url,
      });
    });

    it('should return 404 when link with provided code does not exist', async () => {
      const code = 'qwertyop';

      const response = await request(app.getHttpServer())
        .get(`${modulePath}/${code}`)
        .set('x-api-key', apiKey);

      expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
      expect(response.body.message).toBe(`Link with code ${code} not found`);
    });
  });

  describe('Authorization', () => {
    const endpoints = it.each([
      ['get', modulePath],
      ['post', modulePath],
      ['get', `${modulePath}/somecode`],
    ] as const);
    const wrongKey = 'b'.repeat(32);

    endpoints(
      'should return 401 for %s %s without api key',
      async (method, path) => {
        const response = await request(app.getHttpServer())[method](path);

        expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);
        expect(response.body.message).toBe('Unauthorized');
      },
    );

    endpoints(
      'should return 401 for %s %s with wrong api key',
      async (method, path) => {
        const response = await request(app.getHttpServer())
          [method](path)
          .set('x-api-key', wrongKey);

        expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);
        expect(response.body.message).toBe('Unauthorized');
      },
    );
  });

  describe('GET /:code', () => {
    it('should redirect to the original url when link exists', async () => {
      const existingLink = buildLink();
      await linksRepository.insert(existingLink);

      const response = await request(app.getHttpServer()).get(
        `/${existingLink.code}`,
      );

      expect(response.statusCode).toBe(HttpStatus.FOUND);
      expect(response.headers.location).toBe(existingLink.url);
    });

    it('should return 404 when link with provided code does not exist', async () => {
      const code = 'qwertyop';

      const response = await request(app.getHttpServer()).get(`/${code}`);

      expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
      expect(response.body.message).toBe(`Link with code ${code} not found`);
    });
  });
});
