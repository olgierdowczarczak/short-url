import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
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
    it('should register a user and return it without the password hash', async () => {
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

    it('should store email in lowercase', async () => {
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

    it('should store the password as an argon2 hash', async () => {
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

    it('should return 409 when email is already taken with different casing', async () => {
      await usersRepository.insert({
        email,
        passwordHash,
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'Test@test.com', password });

      expect(response.statusCode).toBe(HttpStatus.CONFLICT);
    });

    it('should create only one user when the same email is registered concurrently', async () => {
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
      ['email is missing', { password }],
      ['email is not a string', { email: 123, password }],
      ['email is invalid', { email: 'aaa', password }],
      ['password is missing', { email }],
      ['password is not a string', { email, password: 123 }],
      [
        'password is shorter than 8 characters',
        { email, password: 'a'.repeat(7) },
      ],
      [
        'password is longer than 128 characters',
        { email, password: 'a'.repeat(129) },
      ],
    ])('should return 400 when %s', async (_, body) => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(body);

      expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(await usersRepository.count()).toBe(0);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email, password });
    });

    it('should return an access token when credentials are valid', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password });

      expect(response.statusCode).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        accessToken: expect.any(String),
      });
    });

    it('should treat email as case-insensitive', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'Test@test.com', password });

      expect(response.statusCode).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        accessToken: expect.any(String),
      });
    });

    it('should return 401 when user does not exist', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'wrongemail@test.com', password });

      expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 when password is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'wrong_password' });

      expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should not reveal whether the email is registered', async () => {
      const wrongEmailResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'wrongemail@test.com', password });
      const wrongPasswordResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'wrong_password' });

      expect(wrongEmailResponse.statusCode).toBe(HttpStatus.UNAUTHORIZED);
      expect(wrongEmailResponse.body).toEqual(wrongPasswordResponse.body);
    });

    it.each([
      ['email is not a string', { email: 123, password }],
      ['email is invalid', { email: 'aaa', password }],
      ['password is not a string', { email, password: 123 }],
      ['password is empty', { email, password: '' }],
      [
        'password is longer than 128 characters',
        { email, password: 'a'.repeat(129) },
      ],
    ])('should return 400 when %s', async (_, body) => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(body);

      expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should issue a JWT with user id, email and configured lifetime', async () => {
      const existingUser = await usersRepository.findOneBy({ email });
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password });

      const payload = app.get(JwtService).verify(response.body.accessToken);

      expect(payload).toMatchObject({
        sub: existingUser!.id,
        email,
      });
      expect(payload.exp - payload.iat).toBe(3600);
    });
  });
});
