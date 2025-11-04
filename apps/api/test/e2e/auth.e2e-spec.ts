jest.setTimeout(30000);

import * as supertest from 'supertest';
import { createTestApp } from '../utils/test-app';

describe('Auth API (e2e)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>> | undefined;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('registers a new user and returns a token', async () => {
    const response = await supertest(app!.app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'auth-spec@example.com',
        password: 'Password123!',
      })
      .expect(201);
    expect(response.headers['set-cookie']).toBeDefined();
    expect(response.body).toMatchObject({
      accessToken: expect.any(String),
      user: {
        id: expect.any(String),
        email: 'auth-spec@example.com',
      },
    });
  });

  it('logs in an existing user', async () => {
    await supertest(app!.app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'auth-login@example.com',
        password: 'Password123!',
      })
      .expect(201);

    const login = await supertest(app!.app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'auth-login@example.com',
        password: 'Password123!',
      })
      .expect(200);

    expect(login.body.accessToken).toBeTruthy();

    const cookieHeader = login.headers['set-cookie'];
    expect(cookieHeader).toBeDefined();

    const me = await supertest(app!.app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookieHeader)
      .expect(200);

    expect(me.body).toMatchObject({
      authenticated: true,
      user: {
        email: 'auth-login@example.com',
      },
    });
  });

  it('prevents duplicate registrations', async () => {
    await supertest(app!.app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'auth-duplicate@example.com',
        password: 'Password123!',
      })
      .expect(201);

    await supertest(app!.app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'auth-duplicate@example.com',
        password: 'AnotherPass123!',
      })
      .expect(409);
  });
});
