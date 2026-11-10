import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { Repository } from 'typeorm';
import argon2 from 'argon2';
import { AppModule } from '../src/app.module.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/users/user.entity.js';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let usersRepository: Repository<User>;

  const email = 'test@test.com';
  const password = 'zaq1@WSX';
  const passwordHash = 'QWERTYUIOP!@#$%^&*()ZXCVBNM';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    usersRepository = app.get(getRepositoryToken(User));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await usersRepository.clear();
  });

  describe('register', () => {
    it('should return 201 when register correct', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email, password });

      expect(response.statusCode).toBe(HttpStatus.CREATED);
      expect(response.body).toEqual({
        id: expect.any(Number),
        email,
        createdAt: expect.any(String),
      });
      expect(await usersRepository.count()).toBe(1);
    });

    it('should return 201 when register correct and email includes uppercase character', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'Test@test.com', password });

      expect(response.statusCode).toBe(HttpStatus.CREATED);
      expect(response.body).toEqual({
        id: expect.any(Number),
        email,
        createdAt: expect.any(String),
      });
      const users = await usersRepository.find();
      expect(users).toHaveLength(1);
      expect(users[0].email).toBe(email);
    });

    it('should encrypt password after registration', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email, password });

      expect(response.statusCode).toBe(HttpStatus.CREATED);
      const user = await usersRepository.findOneBy({ email });
      const verified = await argon2.verify(user!.passwordHash, password);
      expect(verified).toBe(true);
    });

    it('should return 409 when email is already taken', async () => {
      await usersRepository.insert({
        email,
        passwordHash,
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email, password });

      expect(response.statusCode).toBe(HttpStatus.CONFLICT);
    });

    it('should return 409 when email including uppercase character is already taken', async () => {
      await usersRepository.insert({
        email,
        passwordHash,
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'Test@test.com', password });

      expect(response.statusCode).toBe(HttpStatus.CONFLICT);
    });

    it('should handle two parallel requests', async () => {
      const createRequest = () =>
        request(app.getHttpServer())
          .post('/api/auth/register')
          .send({ email, password });

      const responses = (
        await Promise.all([createRequest(), createRequest()])
      ).sort((a, b) => a.statusCode - b.statusCode);

      expect(responses[0].statusCode).toBe(HttpStatus.CREATED);
      expect(responses[1].statusCode).toBe(HttpStatus.CONFLICT);
      expect(await usersRepository.count()).toBe(1);
    });

    it.each([
      ['email is not a string', { email: 123, password }],
      ['email is not a email', { email: 'aaa', password }],
      ['password is not a string', { email, password: 123 }],
      ['password is too short', { email, password: 'qwerty' }],
      ['password is too long', { email, password: 'a'.repeat(129) }],
    ])('should return 400 when %s', async (_, body) => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(body);

      expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email, password });
    });

    it('should return 200 when login correct', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password });

      expect(response.statusCode).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        accessToken: expect.any(String),
      });
    });

    it('should return 200 when login correct and email includes uppercase character', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'Test@test.com', password });

      expect(response.statusCode).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        accessToken: expect.any(String),
      });
    });

    it('should return 401 when email is wrong', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'wrongemail@test.com', password });

      expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 when password is wrong', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'wrong_password' });

      expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);
    });

    it.each([
      ['email is not a string', { email: 123, password }],
      ['email is not a email', { email: 'aaa', password }],
      ['password is not a string', { email, password: 123 }],
      ['password is too short', { email, password: 'qwerty' }],
      ['password is too long', { email, password: 'a'.repeat(129) }],
    ])('should return 400 when %s', async (_, body) => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(body);

      expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });
  });
});
