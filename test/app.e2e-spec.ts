import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

function getSetCookieHeaders(headers: request.Response['headers']): string[] {
  const setCookie = headers['set-cookie'];
  if (!setCookie) {
    return [];
  }
  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let agent: request.Agent;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    prisma = app.get(PrismaService);
    await app.init();

    agent = request.agent(app.getHttpServer());

    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  it('GET / returns health check', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ok');
      });
  });

  it('POST /auth/register creates user and sets auth cookies', async () => {
    const response = await agent
      .post('/auth/register')
      .send({
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      })
      .expect(201);

    expect(response.body.user.email).toBe('newuser@example.com');
    expect(response.body.access_token).toBeUndefined();
    expect(response.body.refresh_token).toBeUndefined();

    const cookies = getSetCookieHeaders(response.headers);
    expect(cookies.some((cookie) => cookie.startsWith('access_token='))).toBe(
      true,
    );
    expect(cookies.some((cookie) => cookie.startsWith('refresh_token='))).toBe(
      true,
    );
  });

  it('POST /auth/login sets auth cookies for registered user', async () => {
    const response = await agent
      .post('/auth/login')
      .send({
        email: 'newuser@example.com',
        password: 'password123',
      })
      .expect(201);

    expect(response.body.user.email).toBe('newuser@example.com');
    expect(response.body.access_token).toBeUndefined();
    expect(response.body.refresh_token).toBeUndefined();
  });

  it('GET /auth/me without token returns 401', () => {
    return request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('GET /auth/me with access token cookie returns 200', () => {
    return agent
      .get('/auth/me')
      .expect(200)
      .expect(({ body }) => {
        expect(body.email).toBe('newuser@example.com');
      });
  });

  it('GET /auth/me with refresh token cookie returns 401', async () => {
    const loginResponse = await agent
      .post('/auth/login')
      .send({
        email: 'newuser@example.com',
        password: 'password123',
      })
      .expect(201);

    const refreshCookie = getSetCookieHeaders(loginResponse.headers).find(
      (cookie) => cookie.startsWith('refresh_token='),
    );

    expect(refreshCookie).toBeDefined();

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', refreshCookie!)
      .expect(401);
  });

  it('POST /auth/refresh rotates cookies and rejects stale refresh token', async () => {
    const loginResponse = await agent
      .post('/auth/login')
      .send({
        email: 'newuser@example.com',
        password: 'password123',
      })
      .expect(201);

    const oldRefreshCookie = getSetCookieHeaders(loginResponse.headers).find(
      (cookie) => cookie.startsWith('refresh_token='),
    );

    expect(oldRefreshCookie).toBeDefined();

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', oldRefreshCookie!)
      .expect(201);

    expect(refreshResponse.body.user.email).toBe('newuser@example.com');
    expect(refreshResponse.body.access_token).toBeUndefined();
    expect(refreshResponse.body.refresh_token).toBeUndefined();

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', oldRefreshCookie!)
      .expect(401);
  });

  it('POST /auth/logout revokes refresh token and clears cookies', async () => {
    await agent
      .post('/auth/login')
      .send({
        email: 'newuser@example.com',
        password: 'password123',
      })
      .expect(201);

    await agent.post('/auth/logout').expect(204);

    await agent.post('/auth/refresh').expect(401);
  });
});
