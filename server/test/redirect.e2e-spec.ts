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
import { ThrottlerGuard } from '@nestjs/throttler';

describe('Redirect (e2e)', () => {
  let app: INestApplication<App>;
  let linksRepository: Repository<Link>;
  let apiKey: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0);

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

  describe('GET /:code', () => {
    it('should redirect to the original url when link exists and is not expired', async () => {
      const existingLink = buildLink({
        expiresAt: new Date('3000-01-01T00:00:00.000Z'),
      });
      await linksRepository.insert(existingLink);

      const response = await request(app.getHttpServer()).get(
        `/${existingLink.code}`,
      );

      expect(response.statusCode).toBe(HttpStatus.FOUND);
      expect(response.headers.location).toBe(existingLink.url);
    });

    it('should return 404 when link does not exist', async () => {
      const code = 'qwertyop';

      const response = await request(app.getHttpServer()).get(`/${code}`);

      expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
      expect(response.body.message).toBe(`Link with code ${code} not found`);
    });

    it('should increment the click count on redirect', async () => {
      const existingLink = buildLink({ clicks: 5 });
      const counterAfterIncrement = existingLink.clicks + 1;
      await linksRepository.insert(existingLink);

      const response = await request(app.getHttpServer()).get(
        `/${existingLink.code}`,
      );

      expect(response.statusCode).toBe(HttpStatus.FOUND);
      const updatedLink = await linksRepository.findOneBy({
        code: existingLink.code,
      });
      expect(updatedLink?.clicks).toBe(counterAfterIncrement);
    });

    it('should count every click under concurrent visits', async () => {
      const existingLink = buildLink({ clicks: 5 });
      const numberOfVisitors = 10;
      const counterAfterIncrement = existingLink.clicks + numberOfVisitors;
      await linksRepository.insert(existingLink);

      const responses = await Promise.all(
        Array.from({ length: numberOfVisitors }).map(() =>
          request(app.getHttpServer()).get(`/${existingLink.code}`),
        ),
      );

      for (const response of responses) {
        expect(response.statusCode).toBe(HttpStatus.FOUND);
      }
      const updatedLink = await linksRepository.findOneBy({
        code: existingLink.code,
      });
      expect(updatedLink?.clicks).toBe(counterAfterIncrement);
    });

    it('should return 410 without counting a click when link has expired', async () => {
      const existingLink = buildLink({
        expiresAt: new Date('2000-01-01T00:00:00.000Z'),
      });
      await linksRepository.insert(existingLink);

      const response = await request(app.getHttpServer()).get(
        `/${existingLink.code}`,
      );

      expect(response.statusCode).toBe(HttpStatus.GONE);
      const updatedLink = await linksRepository.findOneBy({
        code: existingLink.code,
      });
      expect(updatedLink?.clicks).toBe(existingLink.clicks);
    });

    it('should redirect using a custom alias', async () => {
      const url = 'https://example.com';
      const alias = 'my-alias';

      const createResponse = await request(app.getHttpServer())
        .post('/api/links')
        .send({ url, alias })
        .set('x-api-key', apiKey);
      const redirectResponse = await request(app.getHttpServer()).get(
        `/${alias}`,
      );

      expect(createResponse.statusCode).toBe(HttpStatus.CREATED);
      expect(redirectResponse.statusCode).toBe(HttpStatus.FOUND);
      expect(redirectResponse.headers.location).toBe(url);
    });
  });
});
