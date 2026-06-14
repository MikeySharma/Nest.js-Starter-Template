import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { MailQueueService } from '../src/modules/mail/mail-queue.service';
import { MailProcessor } from '../src/modules/mail/mail.processor';
import { EMAIL_QUEUE } from '../src/modules/mail/types/mail.types';
import { PrismaService } from '../src/modules/prisma/prisma.service';

function getSetCookieHeaders(headers: request.Response['headers']): string[] {
  const setCookie = headers['set-cookie'];
  if (!setCookie) {
    return [];
  }
  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

function getTokenFromVerifyUrl(verifyUrl?: string): string {
  if (!verifyUrl) {
    throw new Error('Verification URL was not captured');
  }

  return new URL(verifyUrl).searchParams.get('token')!;
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let agent: request.Agent;
  let lastVerifyUrl: string | undefined;

  const mockMailQueueService = {
    enqueueVerificationEmail: jest.fn(async (data: { verifyUrl: string }) => {
      lastVerifyUrl = data.verifyUrl;
    }),
  };

  const mockEmailQueue = {
    add: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = '0';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailQueueService)
      .useValue(mockMailQueueService)
      .overrideProvider(getQueueToken(EMAIL_QUEUE))
      .useValue(mockEmailQueue)
      .overrideProvider(MailProcessor)
      .useValue({ process: jest.fn() })
      .compile();

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

    await prisma.emailVerificationToken.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.emailVerificationToken.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  beforeEach(() => {
    lastVerifyUrl = undefined;
    mockMailQueueService.enqueueVerificationEmail.mockClear();
  });

  function registerUser(
    email = 'newuser@example.com',
    password = 'password123',
  ) {
    return agent.post('/auth/register').send({
      email,
      password,
      name: 'New User',
    });
  }

  function verifyRegisteredUser() {
    const token = getTokenFromVerifyUrl(lastVerifyUrl);
    return agent.get('/auth/verify-email').query({ token });
  }

  it('GET / returns health check', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ok');
      });
  });

  it('POST /auth/register creates user without auth cookies', async () => {
    const response = await registerUser().expect(201);

    expect(response.body.user.email).toBe('newuser@example.com');
    expect(response.body.user.emailVerifiedAt).toBeNull();
    expect(response.body.message).toContain('verify');
    expect(response.body.access_token).toBeUndefined();
    expect(getSetCookieHeaders(response.headers)).toHaveLength(0);
    expect(lastVerifyUrl).toBeDefined();
  });

  it('POST /auth/login before verification returns 403', async () => {
    await registerUser('blocked@example.com').expect(201);

    await agent
      .post('/auth/login')
      .send({
        email: 'blocked@example.com',
        password: 'password123',
      })
      .expect(403);
  });

  it('GET /auth/verify-email verifies user and sets auth cookies', async () => {
    await registerUser('verify@example.com').expect(201);

    const response = await verifyRegisteredUser().expect(200);

    expect(response.body.user.email).toBe('verify@example.com');
    expect(response.body.user.emailVerifiedAt).toBeDefined();

    const cookies = getSetCookieHeaders(response.headers);
    expect(cookies.some((cookie) => cookie.startsWith('access_token='))).toBe(
      true,
    );
    expect(cookies.some((cookie) => cookie.startsWith('refresh_token='))).toBe(
      true,
    );
  });

  it('GET /auth/verify-email rejects invalid token', async () => {
    await request(app.getHttpServer())
      .get('/auth/verify-email')
      .query({ token: 'invalid-token-value-that-is-long-enough' })
      .expect(401);
  });

  it('GET /auth/verify-email rejects reused token', async () => {
    await registerUser('reuse@example.com').expect(201);
    const token = getTokenFromVerifyUrl(lastVerifyUrl);

    await agent.get('/auth/verify-email').query({ token }).expect(200);

    await request(app.getHttpServer())
      .get('/auth/verify-email')
      .query({ token })
      .expect(401);
  });

  it('POST /auth/resend-verification queues a new email', async () => {
    await registerUser('resend@example.com').expect(201);
    const firstVerifyUrl = lastVerifyUrl;

    await agent
      .post('/auth/resend-verification')
      .send({ email: 'resend@example.com' })
      .expect(204);

    expect(lastVerifyUrl).toBeDefined();
    expect(lastVerifyUrl).not.toBe(firstVerifyUrl);
  });

  it('POST /auth/resend-verification rejects already verified user', async () => {
    await registerUser('verified-resend@example.com').expect(201);
    await verifyRegisteredUser().expect(200);

    await agent
      .post('/auth/resend-verification')
      .send({ email: 'verified-resend@example.com' })
      .expect(400);
  });

  it('POST /auth/login returns token pair for verified user', async () => {
    await registerUser('login@example.com').expect(201);
    await verifyRegisteredUser().expect(200);

    const response = await agent
      .post('/auth/login')
      .send({
        email: 'login@example.com',
        password: 'password123',
      })
      .expect(201);

    expect(response.body.user.email).toBe('login@example.com');
    expect(getSetCookieHeaders(response.headers).length).toBeGreaterThan(0);
  });

  it('GET /auth/me without token returns 401', () => {
    return request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('GET /auth/me with access token cookie returns 200', async () => {
    await registerUser('me@example.com').expect(201);
    await verifyRegisteredUser().expect(200);

    return agent
      .get('/auth/me')
      .expect(200)
      .expect(({ body }) => {
        expect(body.email).toBe('me@example.com');
      });
  });

  it('GET /auth/me with refresh token cookie returns 401', async () => {
    await registerUser('me-refresh@example.com').expect(201);
    const registerResponse = await verifyRegisteredUser().expect(200);

    const refreshCookie = getSetCookieHeaders(registerResponse.headers).find(
      (cookie) => cookie.startsWith('refresh_token='),
    );

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', refreshCookie!)
      .expect(401);
  });

  it('POST /auth/refresh rotates cookies and rejects stale refresh token', async () => {
    await registerUser('refresh@example.com').expect(201);
    const verifyResponse = await verifyRegisteredUser().expect(200);

    const oldRefreshCookie = getSetCookieHeaders(verifyResponse.headers).find(
      (cookie) => cookie.startsWith('refresh_token='),
    );

    const refreshResponse = await agent.post('/auth/refresh').expect(201);
    expect(refreshResponse.body.user.email).toBe('refresh@example.com');

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', oldRefreshCookie!)
      .expect(401);
  });

  it('POST /auth/logout revokes refresh token and clears cookies', async () => {
    await registerUser('logout@example.com').expect(201);
    await verifyRegisteredUser().expect(200);

    await agent.post('/auth/logout').expect(204);
    await agent.post('/auth/refresh').expect(401);
  });
});
