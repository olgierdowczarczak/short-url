import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { Link } from '../src/links/link.entity.js';
import { buildLink } from '../src/links/testing/link.fixtures.js';

describe('Redirect (e2e)', () => {
  let app: INestApplication<App>;
  let linksRepository: Repository<Link>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0);

    linksRepository = app.get(getRepositoryToken(Link));
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

    it('should return 404 when link with provided code does not exist', async () => {
      const code = 'qwertyop';

      const response = await request(app.getHttpServer()).get(`/${code}`);

      expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
      expect(response.body.message).toBe(`Link with code ${code} not found`);
    });

    it('should increment click count after redirect', async () => {
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

    it('should count every click when link is visited concurrently', async () => {
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

    it('should return 410 and not count a click when link is expired', async () => {
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
  });
});
