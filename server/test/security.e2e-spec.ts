import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { setupSecurity } from '../src/config/security.config.js';
import { setupSwagger } from '../src/config/swagger.config.js';

describe('Security (e2e)', () => {
  let app: INestApplication<App>;

  const allowedOrigin = 'http://localhost:5173';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupSecurity(app);
    setupSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(['/docs', '/health'])(
    'should set security headers on %s',
    async (path) => {
      const response = await request(app.getHttpServer()).get(path);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    },
  );

  it('should allow CORS requests from a configured origin', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', allowedOrigin);

    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
  });

  it('should not allow CORS requests from an unknown origin', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'https://evil.example');

    expect(response.headers).not.toHaveProperty('access-control-allow-origin');
  });

  it('should allow the Authorization header in a CORS preflight request', async () => {
    const response = await request(app.getHttpServer())
      .options('/api/links')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization');

    expect(response.statusCode).toBe(HttpStatus.NO_CONTENT);
    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(response.headers['access-control-allow-headers']).toContain(
      'Authorization',
    );
  });
});
