import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap.js';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service.js';
import { PasswordService } from '../src/auth/services/password.service.js';
import { createActiveTestUser } from './helpers/create-test-user.js';
import { randomUUID } from 'node:crypto';

describe('Auth registration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwordService: PasswordService;
  beforeAll(async () => {
    console.log('E2E DATABASE_URL:', process.env.DATABASE_URL);
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    passwordService = app.get(PasswordService);
  });
  afterAll(async () => {
    await app.close();
  });
  it('should register a user', async () => {
    const email = `register-${randomUUID()}@example.com`;

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'Password123!',
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
  it('should login and rotate refresh token', async () => {
    const email = `login-${randomUUID()}@example.com`;
    const { password } = await createActiveTestUser(
      prisma,
      passwordService,
      email,
    );
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email,
        password,
      })
      .expect(200);

    expect(loginResponse.body.accessToken).toBeDefined();

    expect(loginResponse.body.refreshToken).toBeDefined();

    const oldRefreshToken = loginResponse.body.refreshToken;

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken: oldRefreshToken,
      })
      .expect(200);

    expect(refreshResponse.body.accessToken).toBeDefined();

    expect(refreshResponse.body.refreshToken).toBeDefined();

    expect(refreshResponse.body.refreshToken).not.toBe(oldRefreshToken);
  });
  it('should reject reuse of old refresh token', async () => {
    const email = `reuse-${randomUUID()}@example.com`;
    const { password } = await createActiveTestUser(
      prisma,
      passwordService,
      email,
    );
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    const refreshToken = loginResponse.body.refreshToken;

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken,
      })
      .expect(200);

    /*
     * Reuse old token.
     */
    const reuseResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken,
      })
      .expect(401);

    expect(reuseResponse.body.message).toBeDefined();
  });
  it('should invalidate the entire token family after reuse', async () => {
    const email = `family-${randomUUID()}@example.com`;

    const { password } = await createActiveTestUser(
      prisma,
      passwordService,
      email,
    );
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email,
        password,
      })
      .expect(200);

    const tokenA = loginResponse.body.refreshToken;

    const firstRefresh = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken: tokenA,
      })
      .expect(200);

    const tokenB = firstRefresh.body.refreshToken;

    /*
     * Replay A.
     */
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken: tokenA,
      })
      .expect(401);

    /*
     * B should now also be invalid.
     */
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken: tokenB,
      })
      .expect(401);
  });
});
