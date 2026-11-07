import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { Link } from '../src/links/link.entity.js';
import type { Env } from '../src/config/env.schema.js';

describe('Throttling (e2e)', () => {
  let app: INestApplication<App>;
  let linksRepository: Repository<Link>;
  let apiKey: string;

  const modulePath = '/api/links';
  const createLimit = 10;

  const createLink = (key = apiKey) =>
    request(app.getHttpServer())
      .post(modulePath)
      .send({ url: 'https://example.com' })
      .set('x-api-key', key);

  const createLinksUpToLimit = (key = apiKey) =>
    Promise.all(Array.from({ length: createLimit }).map(() => createLink(key)));

  const listLinks = () =>
    request(app.getHttpServer()).get(modulePath).set('x-api-key', apiKey);

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0);

    linksRepository = app.get(getRepositoryToken(Link));
    apiKey = app
      .get<ConfigService<Env, true>>(ConfigService)
      .get('API_KEY', { infer: true });

    await linksRepository.clear();
  });

  afterEach(async () => {
    await app.close();
  });

  describe(`POST ${modulePath}`, () => {
    it('should return 429 when limit of 10 requests is exceeded', async () => {
      const responses = await createLinksUpToLimit();
      const blockedResponse = await createLink();

      responses.forEach((response) => {
        expect(response.statusCode).toBe(HttpStatus.CREATED);
      });
      expect(blockedResponse.statusCode).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(blockedResponse.headers).toHaveProperty('retry-after');
      expect(
        Number(blockedResponse.headers['retry-after']),
      ).toBeLessThanOrEqual(60);
      expect(await linksRepository.count()).toBe(createLimit);
    });

    it('should return 429 instead of 401 when limit is exceeded with wrong api key', async () => {
      const wrongKey = 'wrong-key';

      const responses = await createLinksUpToLimit(wrongKey);
      const blockedResponse = await createLink(wrongKey);

      responses.forEach((response) => {
        expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);
      });
      expect(blockedResponse.statusCode).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(blockedResponse.headers).toHaveProperty('retry-after');
    });
  });

  describe(`GET ${modulePath}`, () => {
    it('should return 200 when POST is blocked', async () => {
      await createLinksUpToLimit();
      const blockedResponse = await createLink();

      const response = await listLinks();

      expect(blockedResponse.statusCode).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(response.statusCode).toBe(HttpStatus.OK);
      expect(response.body).toHaveLength(createLimit);
    });
  });
});
