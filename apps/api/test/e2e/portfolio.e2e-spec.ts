jest.setTimeout(30000);

import * as supertest from 'supertest';
import { createTestApp } from '../utils/test-app';
import { PrismaService } from '../../src/shared/infra/prisma/prisma.service';

describe('Portfolio API (e2e)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>> | undefined;
  let prisma: PrismaService;
  let authCookie: string[] = [];
  let accessToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app!.app.get(PrismaService);

    const server = app!.app.getHttpServer();
    const authResponse = await supertest(server)
      .post('/api/auth/register')
      .send({
        email: 'investor@example.com',
        password: 'Portfolio123!',
      })
      .expect(201);

    const cookieHeader = authResponse.headers['set-cookie'];
    authCookie = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader!];
    accessToken = authResponse.body.accessToken;

    await supertest(server)
      .post('/api/collection')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', authCookie)
      .send({
        cardId: 'stormchaser-talent-001',
        quantity: 2,
        finish: 'FOIL',
        condition: 'NM',
        acquiredPrice: 1.5,
      })
      .expect(201);

    await supertest(server)
      .post('/api/collection')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', authCookie)
      .send({
        cardId: 'lose-focus-001',
        quantity: 3,
        finish: 'NONFOIL',
        condition: 'NM',
        acquiredPrice: 0.4,
      })
      .expect(201);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns portfolio summary with totals and breakdowns', async () => {
    const response = await supertest(app!.app.getHttpServer())
      .get('/api/portfolio/summary')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', authCookie)
      .expect(200);

    expect(response.body).toMatchObject({
      totals: {
        currentValue: expect.any(Number),
        costBasis: expect.any(Number),
        unrealizedGain: expect.any(Number),
      },
      distributionBySet: expect.any(Array),
      topHoldings: expect.any(Array),
      movers: {
        gainers: expect.any(Array),
        losers: expect.any(Array),
      },
      lastUpdated: expect.any(String),
    });

    const { totals, topHoldings, movers } = response.body;

    // current prices from fake Scryfall client: foil stormchaser = 4.00, lose focus = 0.14
    expect(totals.currentValue).toBeCloseTo(2 * 4.0 + 3 * 0.14, 2);
    expect(totals.costBasis).toBeCloseTo(2 * 1.5 + 3 * 0.4, 2);
    expect(topHoldings.length).toBeGreaterThan(0);
    expect(topHoldings[0].cardId).toBe('stormchaser-talent-001');

    expect(movers.gainers.length).toBeGreaterThanOrEqual(1);
    expect(movers.losers.length).toBeGreaterThanOrEqual(1);

    const loser = movers.losers.find((mover: any) => mover.cardId === 'lose-focus-001');
    expect(loser).toBeDefined();
    expect(loser.gain).toBeLessThan(0);
  });
});
