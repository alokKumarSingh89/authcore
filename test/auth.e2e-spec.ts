import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap.js';
import request from 'supertest';

describe('Auth registration (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it('should register a user', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `test-${Date.now()}@example.com`,
        password: 'StrongPassword123!',
        firstName: 'Test',
        lastName: 'User',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      firstName: 'Test',
      lastName: 'User',
      status: 'PENDING_VERIFICATION',
    });
    expect(response.body.passwordHash).toBeUndefined();
  });
});
