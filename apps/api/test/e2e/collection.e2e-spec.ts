import * as supertest from 'supertest';
import { PrismaService } from '../../src/shared/infra/prisma/prisma.service';
import { createTestApp } from '../utils/test-app';

describe('Collection API (e2e)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('searches catalog via Scryfall mock', async () => {
    const response = await supertest(app.app.getHttpServer())
      .get('/api/catalog/search')
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

  it('creates, lists, exports, and imports collection entries', async () => {
    const httpServer = app.app.getHttpServer();

    // Add a card to the collection
    const createResponse = await supertest(httpServer)
      .post('/api/collection')
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
      .query({ format: 'csv', includePrices: 'true' })
      .expect(200);

    expect(exportResponse.header['content-type']).toContain('text/csv');
    expect(exportResponse.header['content-disposition']).toContain('attachment');

    // Import another card via plain text
    const importResponse = await supertest(httpServer)
      .post('/api/collection/import')
      .send({
        format: 'auto',
        payload: '1 Lose Focus (mh2) 75',
      })
      .expect(201);

    expect(importResponse.body.imported).toBe(1);
    expect(importResponse.body.failures).toHaveLength(0);

    const postImportList = await supertest(httpServer)
      .get('/api/collection')
      .expect(200);

    expect(postImportList.body.items.length).toBeGreaterThanOrEqual(2);
  });
});
