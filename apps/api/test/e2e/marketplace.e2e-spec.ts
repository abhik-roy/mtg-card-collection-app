jest.setTimeout(30000);

import * as supertest from 'supertest';
import { createTestApp } from '../utils/test-app';

describe('Marketplace API (e2e)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>> | undefined;
  let authCookie: string[] = [];
  let accessToken: string;

  let otherCookie: string[] = [];
  let otherToken: string;

  beforeAll(async () => {
    app = await createTestApp();

    const server = app!.app.getHttpServer();
    const authResponse = await supertest(server)
      .post('/api/auth/register')
      .send({
        email: 'seller@example.com',
        password: 'Password123!',
      })
      .expect(201);
    authCookie = asCookieArray(authResponse.headers['set-cookie']);
    accessToken = authResponse.body.accessToken;

    const otherResponse = await supertest(server)
      .post('/api/auth/register')
      .send({
        email: 'buyer@example.com',
        password: 'Password123!',
      })
      .expect(201);
    otherCookie = asCookieArray(otherResponse.headers['set-cookie']);
    otherToken = otherResponse.body.accessToken;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('allows users to create, list, and delete marketplace listings', async () => {
    const server = app!.app.getHttpServer();

    const createResponse = await supertest(server)
      .post('/api/marketplace/listings')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', authCookie)
      .send({
        type: 'SELL',
        cardName: "Stormchaser's Talent",
        cardId: 'stormchaser-talent-001',
        setCode: 'blb',
        condition: 'NM',
        quantity: 2,
        price: 10.5,
        currency: 'USD',
        notes: 'Foil copies, mint condition',
      })
      .expect(201);

    const listingId = createResponse.body.id;
    expect(createResponse.body).toMatchObject({
      type: 'SELL',
      cardName: "Stormchaser's Talent",
      seller: {
        email: 'seller@example.com',
      },
    });

    const listResponse = await supertest(server)
      .get('/api/marketplace/listings')
      .set('Authorization', `Bearer ${otherToken}`)
      .set('Cookie', otherCookie)
      .query({ search: 'storm' })
      .expect(200);

    expect(listResponse.body.items.length).toBeGreaterThan(0);

    await supertest(server)
      .delete(`/api/marketplace/listings/${listingId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', authCookie)
      .expect(200);

    const afterDelete = await supertest(server)
      .get('/api/marketplace/listings')
      .set('Authorization', `Bearer ${otherToken}`)
      .set('Cookie', otherCookie)
      .query({ search: 'storm' })
      .expect(200);

    expect(afterDelete.body.items.find((item: any) => item.id === listingId)).toBeUndefined();
  });

  it('prevents deleting another user listing', async () => {
    const server = app!.app.getHttpServer();

    const createResponse = await supertest(server)
      .post('/api/marketplace/listings')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', authCookie)
      .send({
        type: 'BUY',
        cardName: 'Lose Focus',
        price: 1.0,
      })
      .expect(201);

    const listingId = createResponse.body.id;

    await supertest(server)
      .delete(`/api/marketplace/listings/${listingId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .set('Cookie', otherCookie)
      .expect(404);
  });
});

function asCookieArray(header: string | string[] | undefined): string[] {
  if (!header) return [];
  return Array.isArray(header) ? header : [header];
}
