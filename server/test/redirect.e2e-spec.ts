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
    await app.init();

    linksRepository = app.get(getRepositoryToken(Link));
  });

  beforeEach(async () => {
    await linksRepository.clear();
  });

  afterAll(async () => {
    await app.close();
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
