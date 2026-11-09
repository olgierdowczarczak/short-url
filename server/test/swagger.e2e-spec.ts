import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { setupSwagger } from '../src/config/swagger.config.js';

describe('Swagger (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /docs', () => {
    it('should return 200', async () => {
      const response = await request(app.getHttpServer()).get('/docs');

      expect(response.statusCode).toBe(HttpStatus.OK);
    });
  });

  describe('GET /docs-json', () => {
    it('should return OpenAPI document', async () => {
      const response = await request(app.getHttpServer()).get('/docs-json');

      expect(response.statusCode).toBe(HttpStatus.OK);
      expect(response.body.paths).toHaveProperty('/api/links');
      expect(response.body.paths).toHaveProperty('/api/links/{code}');
      expect(response.body.paths).toHaveProperty('/{code}');
      expect(response.body.components.securitySchemes).toEqual({
        'api-key': {
          in: 'header',
          name: 'x-api-key',
          type: 'apiKey',
        },
      });
      expect(response.body.components.schemas.CreateLinkDto.required).toEqual([
        'url',
      ]);
    });
  });
});
