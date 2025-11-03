jest.setTimeout(30000);

import * as supertest from 'supertest';
import { PrismaService } from '../../src/shared/infra/prisma/prisma.service';
import { createTestApp } from '../utils/test-app';

describe('Alerts API (e2e)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>> | undefined;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app!.app.get(PrismaService);

    const httpServer = app!.app.getHttpServer();
    const authResponse = await supertest(httpServer)
      .post('/api/auth/register')
      .send({
        email: 'alerts@example.com',
        password: 'Password123!',
      })
      .expect(201);

    accessToken = authResponse.body.accessToken;
    userId = authResponse.body.user.id;

    await prisma.catalogCache.create({
      data: {
        cardId: 'stormchaser-talent-001',
        name: "Stormchaser's Talent",
        setCode: 'blb',
        collectorNumber: '75',
        lang: 'en',
        usd: 1.73,
        usdFoil: 4.0,
        imageSmall: 'https://example.com/stormchaser-small.jpg',
        imageNormal: null,
      },
    });

    await prisma.collectionEntry.create({
      data: {
        id: 'entry-1',
        userId,
        cardId: 'stormchaser-talent-001',
        quantity: 1,
        finish: 'NONFOIL',
        condition: 'NM',
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('lists baseline watches', async () => {
    const response = await supertest(app!.app.getHttpServer())
      .get('/api/alerts')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.items.length).toBeGreaterThan(0);
    const autoWatch = response.body.items.find((watch: any) => watch.cardId === 'stormchaser-talent-001');
    expect(autoWatch).toBeDefined();
    expect(autoWatch.contact).toBe('auto@local');
  });

  it('creates and deletes a manual watch', async () => {
    const httpServer = app!.app.getHttpServer();

    const createResponse = await supertest(httpServer)
      .post('/api/alerts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        cardId: 'stormchaser-talent-001',
        thresholdPercent: 25,
        direction: 'UP',
        priceType: 'USD',
        contact: 'qa@example.com',
      })
      .expect(201);

    expect(createResponse.body).toHaveProperty('id');

    const listResponse = await supertest(httpServer)
      .get('/api/alerts')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const manualWatch = listResponse.body.items.find((watch: any) => watch.contact === 'qa@example.com');
    expect(manualWatch).toBeDefined();

    await supertest(httpServer)
      .delete(`/api/alerts/${manualWatch.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const afterDelete = await supertest(httpServer)
      .get('/api/alerts')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const stillExists = afterDelete.body.items.some((watch: any) => watch.id === manualWatch.id);
    expect(stillExists).toBe(false);
  });

  it('validates payloads and returns problem details for bad requests', async () => {
    const httpServer = app!.app.getHttpServer();

    const invalid = await supertest(httpServer)
      .post('/api/alerts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        cardId: '',
        thresholdPercent: 0,
        direction: 'UP',
        priceType: 'USD',
        contact: 'not-an-email',
      })
      .expect(400);

    expect(invalid.body).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });

    const missing = await supertest(httpServer)
      .delete('/api/alerts/00000000-0000-4000-8000-000000000001')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    expect(missing.body.error.code).toBe('NOT_FOUND');
  });
});
