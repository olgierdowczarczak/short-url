import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { App } from 'supertest/types.js';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { Link } from '../src/links/link.entity.js';

describe('Links (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    const links = app.get<Repository<Link>>(getRepositoryToken(Link));
    await links.clear();
  });

  afterAll(async () => {
    await app.close();
  });
});
