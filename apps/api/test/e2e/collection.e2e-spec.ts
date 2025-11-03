import * as supertest from 'supertest';
import { PrismaService } from '../../src/shared/infra/prisma/prisma.service';
import { createTestApp } from '../utils/test-app';

describe('Collection API (e2e)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let prisma: PrismaService;
  let accessToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.app.get(PrismaService);

    const httpServer = app.app.getHttpServer();
    const authResponse = await supertest(httpServer)
      .post('/api/auth/register')
      .send({
        email: 'collector@example.com',
        password: 'Password123!',
      })
      .expect(201);

    accessToken = authResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('searches catalog via Scryfall mock', async () => {
    const response = await supertest(app.app.getHttpServer())
      .get('/api/catalog/search')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ q: 'storm' })
      .expect(200);

    expect(response.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'stormchaser-talent-001',
          name: "Stormchaser's Talent",
          set: 'blb',
        }),
      ]),
    );
  });

  it('fetches catalog entries by id and handles 404s', async () => {
    const httpServer = app.app.getHttpServer();

    const success = await supertest(httpServer)
      .get('/api/catalog/stormchaser-talent-001')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(success.body).toMatchObject({
      id: 'stormchaser-talent-001',
      name: "Stormchaser's Talent",
      set: 'blb',
    });

    const notFound = await supertest(httpServer)
      .get('/api/catalog/unknown-card')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    expect(notFound.body).toMatchObject({
      error: {
        code: 'NOT_FOUND',
      },
    });
  });

  it('creates, lists, exports, and imports collection entries', async () => {
    const httpServer = app.app.getHttpServer();

    // Add a card to the collection
    const createResponse = await supertest(httpServer)
      .post('/api/collection')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        cardId: 'stormchaser-talent-001',
        quantity: 2,
        finish: 'FOIL',
        condition: 'NM',
      })
      .expect(201);

    expect(createResponse.body).toHaveProperty('id');

    // List entries and verify
    const listResponse = await supertest(httpServer)
      .get('/api/collection')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(listResponse.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cardId: 'stormchaser-talent-001',
          quantity: 2,
          finish: 'FOIL',
        }),
      ]),
    );

    // Export CSV
    const exportResponse = await supertest(httpServer)
      .get('/api/collection/export')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ format: 'csv', includePrices: 'true' })
      .expect(200);

    expect(exportResponse.header['content-type']).toContain('text/csv');
    expect(exportResponse.header['content-disposition']).toContain('attachment');

    // Import another card via plain text
    const importResponse = await supertest(httpServer)
      .post('/api/collection/import')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        format: 'auto',
        payload: '1 Lose Focus (mh2) 75',
      })
      .expect(201);

    expect(importResponse.body.imported).toBe(1);
    expect(importResponse.body.failures).toHaveLength(0);

    const postImportList = await supertest(httpServer)
      .get('/api/collection')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(postImportList.body.items.length).toBeGreaterThanOrEqual(2);

    const entryId = listResponse.body.items[0].id;

    await supertest(httpServer)
      .patch(`/api/collection/${entryId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        quantity: 4,
        finish: 'NONFOIL',
        location: 'Storage',
      })
      .expect(200);

    const afterUpdate = await supertest(httpServer)
      .get('/api/collection')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const updated = afterUpdate.body.items.find((item: any) => item.id === entryId);
    expect(updated).toMatchObject({
      quantity: 4,
      finish: 'NONFOIL',
      location: 'Storage',
    });

    await supertest(httpServer)
      .delete(`/api/collection/${entryId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const afterDelete = await supertest(httpServer)
      .get('/api/collection')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const deleted = afterDelete.body.items.find((item: any) => item.id === entryId);
    expect(deleted).toBeUndefined();
  });

  it('rejects invalid collection payloads with problem details', async () => {
    const httpServer = app.app.getHttpServer();

    const response = await supertest(httpServer)
      .post('/api/collection')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        cardId: '',
        quantity: 0,
        finish: 'INVALID',
        condition: 'BAD',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
      },
    });

    const notFound = await supertest(httpServer)
      .delete('/api/collection/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    expect(notFound.body.error.code).toBe('NOT_FOUND');
  });

  it('reports failures during import when cards cannot be resolved', async () => {
    const httpServer = app.app.getHttpServer();

    const response = await supertest(httpServer)
      .post('/api/collection/import')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        payload: '2 Missing Card',
      })
      .expect(201);

    expect(response.body.imported).toBe(0);
    expect(response.body.failures).toHaveLength(1);
    expect(response.body.failures[0].raw).toBe('2 Missing Card');
  });
});
