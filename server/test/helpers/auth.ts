import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';

export const getAccessToken = async (
  app: INestApplication,
  email = 'test@test.com',
  password = 'zaq1@WSX',
): Promise<string> => {
  const registerResponse = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({ email, password });
  if (registerResponse.status !== HttpStatus.CREATED) {
    throw new Error(
      `Registration failed with status ${registerResponse.status}`,
    );
  }

  const loginResponse = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password });
  if (loginResponse.status !== HttpStatus.OK) {
    throw new Error(`Login failed with status ${loginResponse.status}`);
  }

  return loginResponse.body.accessToken;
};
