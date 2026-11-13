import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { Link } from '../src/links/link.entity.js';
import { User } from '../src/users/user.entity.js';
import { getAccessToken } from './helpers/auth.js';

describe('Throttling (e2e)', () => {
  let app: INestApplication<App>;
  let linksRepository: Repository<Link>;
  let usersRepository: Repository<User>;
  let bearerToken: string;

  const createLimit = 10;

  const createLink = (token: string = bearerToken) =>
    request(app.getHttpServer())
      .post('/api/links')
      .send({ url: 'https://example.com' })
      .set('Authorization', `Bearer ${token}`);

  const createLinksUpToLimit = (token: string) =>
    Promise.all(
      Array.from({ length: createLimit }).map(() => createLink(token)),
    );

  const listLinks = (token: string) =>
    request(app.getHttpServer())
      .get('/api/links')
      .set('Authorization', `Bearer ${token}`);

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0);

    linksRepository = app.get(getRepositoryToken(Link));
    usersRepository = app.get(getRepositoryToken(User));

    await linksRepository.clear();
    await usersRepository.clear();
    bearerToken = await getAccessToken(app);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/links', () => {
    it('should return 429 with retry-after once 10 requests per minute are exceeded', async () => {
      const responses = await createLinksUpToLimit(bearerToken);
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

    it('should apply rate limiting before authentication', async () => {
      const invalidToken = 'invalid-token';

      const responses = await createLinksUpToLimit(invalidToken);
      const blockedResponse = await createLink(invalidToken);

      responses.forEach((response) => {
        expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);
      });
      expect(blockedResponse.statusCode).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(blockedResponse.headers).toHaveProperty('retry-after');
    });
  });

  describe('GET /api/links', () => {
    it('should track limits per route and keep GET available when POST is limited', async () => {
      await createLinksUpToLimit(bearerToken);
      const blockedResponse = await createLink();

      const response = await listLinks(bearerToken);

      expect(blockedResponse.statusCode).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(response.statusCode).toBe(HttpStatus.OK);
      expect(response.body).toHaveLength(createLimit);
    });
  });
});
