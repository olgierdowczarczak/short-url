import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { DataSource } from 'typeorm';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should report healthy status without rate limiting when database is up', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect(response.statusCode).toBe(HttpStatus.OK);
    expect(response.headers).not.toHaveProperty('x-ratelimit-limit');
    expect(response.body.status).toBe('ok');
    expect(response.body.info.database.status).toBe('up');
  });

  it('should return 503 when database is unavailable', async () => {
    await app.get(DataSource).destroy();
    const response = await request(app.getHttpServer()).get('/health');

    expect(response.statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(response.body.status).toBe('error');
  });
});
