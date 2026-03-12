import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/infrastructure/filters/http-exception.filter';

interface AuthApiBody {
  accessToken: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatar: string | null;
    signature: string | null;
  };
}

interface ErrorApiBody {
  message: string | string[];
}

function getSetCookieHeaders(headers: Record<string, unknown>): string[] {
  const rawSetCookie = headers['set-cookie'];
  if (Array.isArray(rawSetCookie)) {
    return rawSetCookie.filter(
      (cookie): cookie is string => typeof cookie === 'string',
    );
  }

  if (typeof rawSetCookie === 'string') {
    return [rawSetCookie];
  }

  return [];
}

describe('Server (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env['PORT'] = process.env['PORT'] ?? '3000';
    process.env['CLIENT_URL'] =
      process.env['CLIENT_URL'] ?? 'http://localhost:5173';
    process.env['JWT_SECRET'] =
      process.env['JWT_SECRET'] ?? 'test-access-secret';
    process.env['JWT_REFRESH_SECRET'] =
      process.env['JWT_REFRESH_SECRET'] ?? 'test-refresh-secret';
    process.env['ACCESS_TOKEN_EXPIRES_IN'] =
      process.env['ACCESS_TOKEN_EXPIRES_IN'] ?? '15m';
    process.env['REFRESH_TOKEN_EXPIRES_IN'] =
      process.env['REFRESH_TOKEN_EXPIRES_IN'] ?? '30d';
    process.env['REFRESH_TOKEN_ABSOLUTE_TTL_DAYS'] =
      process.env['REFRESH_TOKEN_ABSOLUTE_TTL_DAYS'] ?? '180';
    process.env['REFRESH_TOKEN_COOKIE_NAME'] =
      process.env['REFRESH_TOKEN_COOKIE_NAME'] ?? 'refresh_token';
    process.env['REFRESH_TOKEN_COOKIE_MAX_AGE_MS'] =
      process.env['REFRESH_TOKEN_COOKIE_MAX_AGE_MS'] ??
      `${30 * 24 * 60 * 60 * 1000}`;
    process.env['COOKIE_SECURE'] = process.env['COOKIE_SECURE'] ?? 'false';
    process.env['COOKIE_SAME_SITE'] = process.env['COOKIE_SAME_SITE'] ?? 'lax';
    process.env['COOKIE_PATH'] = process.env['COOKIE_PATH'] ?? '/';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET / should return hello world', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('POST /auth/register should create a user, return token and set refresh cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: 'playerone',
        email: 'player.one@example.com',
        password: '12345678',
      })
      .expect(201);

    const body = response.body as unknown as AuthApiBody;

    expect(typeof body.accessToken).toBe('string');
    expect(typeof body.user.id).toBe('string');
    expect(body.user.username).toBe('playerone');
    expect(body.user.email).toBe('player.one@example.com');
    expect(body.user.avatar).toBeNull();
    expect(body.user.signature).toBeNull();

    const cookieHeader = getSetCookieHeaders(
      response.headers as Record<string, unknown>,
    ).join('; ');
    expect(cookieHeader).toContain(
      `${process.env['REFRESH_TOKEN_COOKIE_NAME']}=`,
    );
    expect(cookieHeader).toContain('HttpOnly');
  });

  it('POST /auth/register should reject duplicate email', async () => {
    await request(app.getHttpServer()).post('/auth/register').send({
      username: 'firstuser',
      email: 'dup@example.com',
      password: '12345678',
    });

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: 'seconduser',
        email: 'dup@example.com',
        password: '12345678',
      })
      .expect(409);

    const body = response.body as unknown as ErrorApiBody;

    expect(body.message).toBe('Email already exists');
  });

  it('POST /auth/login should return token and set refresh cookie for valid credentials', async () => {
    await request(app.getHttpServer()).post('/auth/register').send({
      username: 'loginuser',
      email: 'login@example.com',
      password: '12345678',
    });

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'login@example.com',
        password: '12345678',
      })
      .expect(200);

    const body = response.body as unknown as AuthApiBody;

    expect(body.accessToken).toEqual(expect.any(String));
    expect(body.user.email).toBe('login@example.com');

    const cookieHeader = getSetCookieHeaders(
      response.headers as Record<string, unknown>,
    ).join('; ');
    expect(cookieHeader).toContain(
      `${process.env['REFRESH_TOKEN_COOKIE_NAME']}=`,
    );
    expect(cookieHeader).toContain('HttpOnly');
  });

  it('POST /auth/login should reject invalid credentials', async () => {
    await request(app.getHttpServer()).post('/auth/register').send({
      username: 'badloginuser',
      email: 'bad-login@example.com',
      password: '12345678',
    });

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'bad-login@example.com',
        password: 'wrong-pass',
      })
      .expect(401);

    const body = response.body as unknown as ErrorApiBody;

    expect(body.message).toBe('Invalid credentials');
  });

  it('POST /auth/register should reject invalid DTO', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: 'ab',
        email: 'not-an-email',
        password: 'short',
      })
      .expect(400);

    const body = response.body as unknown as ErrorApiBody;

    expect(body.message).toEqual(expect.any(Array));
  });

  it('POST /auth/refresh should issue new tokens and rotate the refresh cookie', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: 'refreshuser',
        email: 'refresh@example.com',
        password: '12345678',
      })
      .expect(201);

    const setCookieReg = getSetCookieHeaders(
      registerResponse.headers as Record<string, unknown>,
    );
    const cookieName =
      process.env['REFRESH_TOKEN_COOKIE_NAME'] ?? 'refresh_token';
    const refreshCookie = setCookieReg.find((c) =>
      c.startsWith(`${cookieName}=`),
    )!;
    const cookieValue = refreshCookie.split(';')[0]; // "refresh_token=<value>"

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookieValue)
      .expect(200);

    const refreshBody = refreshResponse.body as unknown as AuthApiBody;
    expect(refreshBody.accessToken).toEqual(expect.any(String));
    expect(refreshBody.user.email).toBe('refresh@example.com');

    const setCookieRefresh = getSetCookieHeaders(
      refreshResponse.headers as Record<string, unknown>,
    );
    const newRefreshCookie = setCookieRefresh.find((c) =>
      c.startsWith(`${cookieName}=`),
    );
    expect(newRefreshCookie).toBeDefined();

    // Old cookie must not be re-usable (rotation)
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookieValue)
      .expect(401);
  });

  it('POST /auth/refresh should fail with no cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .expect(401);

    const body = response.body as unknown as ErrorApiBody;
    expect(body.message).toBe('Refresh token not found');
  });

  it('POST /auth/logout should clear the refresh cookie', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: 'logoutuser',
        email: 'logout@example.com',
        password: '12345678',
      })
      .expect(201);

    const setCookieReg = getSetCookieHeaders(
      registerResponse.headers as Record<string, unknown>,
    );
    const cookieName =
      process.env['REFRESH_TOKEN_COOKIE_NAME'] ?? 'refresh_token';
    const refreshCookie = setCookieReg.find((c) =>
      c.startsWith(`${cookieName}=`),
    )!;
    const cookieValue = refreshCookie.split(';')[0];

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookieValue)
      .expect(204);

    // After logout the refresh token must be revoked
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookieValue)
      .expect(401);
  });

  it('PATCH /users/me should update profile for authorized user', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: 'profileuser',
        email: 'profile@example.com',
        password: '12345678',
      })
      .expect(201);

    const registerBody = registerResponse.body as unknown as AuthApiBody;
    const token = registerBody.accessToken;

    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .field('username', 'profileupdated')
      .field('signature', 'Ready to battle')
      .attach('avatar', Buffer.from('fake-image-content'), 'avatar.png')
      .expect(200);

    const body = response.body as unknown as AuthApiBody;

    expect(body.user.username).toBe('profileupdated');
    expect(body.user.signature).toBe('Ready to battle');
    expect(body.user.avatar).toEqual(expect.stringContaining('/uploads/'));
    expect(body.accessToken).toEqual(expect.any(String));
  });

  it('PATCH /users/me should reject unauthorized request', async () => {
    await request(app.getHttpServer())
      .patch('/users/me')
      .field('username', 'new-name')
      .expect(401);
  });

  describe('Token Reuse Detection', () => {
    it('should detect and block reused refresh tokens', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'reuseuser',
          email: 'reuse@example.com',
          password: '12345678',
        })
        .expect(201);

      const setCookieReg = getSetCookieHeaders(
        registerResponse.headers as Record<string, unknown>,
      );
      const cookieName =
        process.env['REFRESH_TOKEN_COOKIE_NAME'] ?? 'refresh_token';
      const refreshCookie = setCookieReg.find((c) =>
        c.startsWith(`${cookieName}=`),
      )!;
      const cookieValue = refreshCookie.split(';')[0];

      // First refresh should succeed
      const firstRefresh = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookieValue)
        .expect(200);

      const firstRefreshBody = firstRefresh.body as unknown as AuthApiBody;
      expect(firstRefreshBody.accessToken).toEqual(expect.any(String));

      // Reusing the old token should be detected and blocked
      const reuseAttempt = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookieValue)
        .expect(401);

      const body = reuseAttempt.body as unknown as ErrorApiBody;
      expect(body.message).toBe('Refresh token already used');
    });
  });

  describe('Validation Errors', () => {
    it('POST /auth/register should validate email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'validuser',
          email: 'not-a-valid-email',
          password: '12345678',
        })
        .expect(400);

      const body = response.body as unknown as ErrorApiBody;
      expect(body.message).toEqual(expect.any(Array));
    });

    it('POST /auth/register should validate password length', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'validuser',
          email: 'valid@example.com',
          password: '123',
        })
        .expect(400);

      const body = response.body as unknown as ErrorApiBody;
      expect(body.message).toEqual(expect.any(Array));
    });

    it('POST /auth/register should validate username format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'invalid_username',
          email: 'valid@example.com',
          password: '12345678',
        })
        .expect(400);

      const body = response.body as unknown as ErrorApiBody;
      expect(body.message).toEqual(expect.any(Array));
    });

    it('POST /auth/login should reject missing email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          password: '12345678',
        })
        .expect(400);

      const body = response.body as unknown as ErrorApiBody;
      expect(body.message).toEqual(expect.any(Array));
    });

    it('POST /auth/login should reject missing password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
        })
        .expect(400);

      const body = response.body as unknown as ErrorApiBody;
      expect(body.message).toEqual(expect.any(Array));
    });
  });

  describe('Profile Operations', () => {
    it('PATCH /users/me should update username', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'usernamechangeuser',
          email: 'username-change@example.com',
          password: '12345678',
        })
        .expect(201);

      const token = (registerResponse.body as unknown as AuthApiBody)
        .accessToken;

      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .field('username', 'newusername123')
        .expect(200);

      const body = response.body as unknown as AuthApiBody;
      expect(body.user.username).toBe('newusername123');
    });

    it('PATCH /users/me should reject duplicate username', async () => {
      // Create first user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'firstuser123',
          email: 'first@example.com',
          password: '12345678',
        })
        .expect(201);

      // Create second user
      const user2 = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'seconduser123',
          email: 'second@example.com',
          password: '12345678',
        })
        .expect(201);

      const token = (user2.body as unknown as AuthApiBody).accessToken;

      // Try to change username to first user's username
      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .field('username', 'firstuser123')
        .expect(409);

      const body = response.body as unknown as ErrorApiBody;
      expect(body.message).toBe('Username already exists');
    });

    it('PATCH /users/me should update password and clear old refresh tokens', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'passwordchangeuser',
          email: 'password-change@example.com',
          password: 'oldpassword123',
        })
        .expect(201);

      const registerBody = registerResponse.body as unknown as AuthApiBody;
      const token = registerBody.accessToken;

      const setCookieReg = getSetCookieHeaders(
        registerResponse.headers as Record<string, unknown>,
      );
      const cookieName =
        process.env['REFRESH_TOKEN_COOKIE_NAME'] ?? 'refresh_token';
      const oldRefreshCookie = setCookieReg.find((c) =>
        c.startsWith(`${cookieName}=`),
      )!;
      const oldCookieValue = oldRefreshCookie.split(';')[0];

      // Change password
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .field('password', 'newpassword123')
        .expect(200);

      // Old refresh token should no longer work
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', oldCookieValue)
        .expect(401);

      // Login with new password should work
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'password-change@example.com',
          password: 'newpassword123',
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('accessToken');
    });

    it('PATCH /users/me should update signature', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'signatureuser',
          email: 'signature@example.com',
          password: '12345678',
        })
        .expect(201);

      const token = (registerResponse.body as unknown as AuthApiBody)
        .accessToken;

      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .field('signature', 'Battle-ready!')
        .expect(200);

      const body = response.body as unknown as AuthApiBody;
      expect(body.user.signature).toBe('Battle-ready!');
    });

    it('PATCH /users/me should return new access token after update', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'tokenuser',
          email: 'token@example.com',
          password: '12345678',
        })
        .expect(201);

      const oldToken = (registerResponse.body as unknown as AuthApiBody)
        .accessToken;

      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${oldToken}`)
        .field('username', 'tokenuserupdated')
        .expect(200);

      const newToken = (response.body as unknown as AuthApiBody).accessToken;
      expect(newToken).toEqual(expect.any(String));

      // New token should be accepted by a protected endpoint
      const protectedResponse = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${newToken}`)
        .field('signature', 'Token still works')
        .expect(200);

      expect(protectedResponse.body).toHaveProperty('user');
    });
  });

  describe('Login with Different Email Cases', () => {
    it('POST /auth/login should handle email case-insensitivity', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'caseuser',
          email: 'CaseEmail@Example.com',
          password: '12345678',
        })
        .expect(201);

      // Login with different case should work
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'caseemail@example.com',
          password: '12345678',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
    });
  });

  describe('Refresh Token Checks', () => {
    it('POST /auth/refresh should return 401 with expired token', async () => {
      // This test would need to mock time passing or manipulate the token
      // For now, we just verify the endpoint handles invalid tokens
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set(
          'Cookie',
          `${process.env['REFRESH_TOKEN_COOKIE_NAME'] ?? 'refresh_token'}=invalid-token-value`,
        )
        .expect(401);

      const body = response.body as unknown as ErrorApiBody;
      expect(body.message).toBe('Invalid or expired refresh token');
    });
  });
});
