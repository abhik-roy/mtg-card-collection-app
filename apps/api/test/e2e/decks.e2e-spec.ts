import * as supertest from 'supertest';
import { createTestApp } from '../utils/test-app';

const TEST_DECK = {
  name: 'Izzet Tempo',
  format: 'Modern',
  description: 'Test deck',
  cards: [
    { cardId: 'stormchaser-talent-001', quantity: 4, board: 'MAIN' as const },
    { cardId: 'lose-focus-001', quantity: 2, board: 'SIDE' as const },
  ],
};

describe('Decks API (e2e)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>> | undefined;
  let accessToken: string;
  let deckId: string;

  beforeAll(async () => {
    app = await createTestApp();

    const authResponse = await supertest(app!.app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'decks@example.com',
        password: 'Password123!',
      })
      .expect(201);

    accessToken = authResponse.body.accessToken;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('creates a deck with cards', async () => {
    const response = await supertest(app!.app.getHttpServer())
      .post('/api/decks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(TEST_DECK)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      name: TEST_DECK.name,
      cards: expect.arrayContaining([
        expect.objectContaining({ cardId: 'stormchaser-talent-001', quantity: 4, board: 'MAIN' }),
        expect.objectContaining({ cardId: 'lose-focus-001', quantity: 2, board: 'SIDE' }),
      ]),
    });

    deckId = response.body.id;
  });

  it('lists decks for the user', async () => {
    const response = await supertest(app!.app.getHttpServer())
      .get('/api/decks')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.items.length).toBeGreaterThanOrEqual(1);
    expect(response.body.items[0]).toMatchObject({
      id: deckId,
      name: TEST_DECK.name,
    });
  });

  it('retrieves deck details', async () => {
    const response = await supertest(app!.app.getHttpServer())
      .get(`/api/decks/${deckId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.cards).toHaveLength(2);
  });

  it('updates deck metadata and cards', async () => {
    const response = await supertest(app!.app.getHttpServer())
      .patch(`/api/decks/${deckId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Izzet Tempo v2',
        description: null,
        cards: [
          { cardId: 'stormchaser-talent-001', quantity: 3, board: 'MAIN' },
          { cardId: 'lose-focus-001', quantity: 2, board: 'MAIN' },
        ],
      })
      .expect(200);

    expect(response.body.name).toBe('Izzet Tempo v2');
    expect(response.body.description).toBeNull();
    expect(response.body.cards).toHaveLength(2);
    expect(response.body.cards.find((card: any) => card.cardId === 'lose-focus-001').board).toBe('MAIN');
  });

  it('compares deck against collection entries', async () => {
    // Add collection entries for comparison
    await supertest(app!.app.getHttpServer())
      .post('/api/collection')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        cardId: 'stormchaser-talent-001',
        quantity: 2,
        finish: 'NONFOIL',
        condition: 'NM',
      })
      .expect(201);

    const compare = await supertest(app!.app.getHttpServer())
      .get(`/api/decks/${deckId}/compare`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const main = compare.body.main.find((card: any) => card.cardId === 'stormchaser-talent-001');
    expect(main).toMatchObject({ required: 3, owned: 2, missing: 1 });
  });

  it('deletes the deck', async () => {
    await supertest(app!.app.getHttpServer())
      .delete(`/api/decks/${deckId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await supertest(app!.app.getHttpServer())
      .get(`/api/decks/${deckId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
});
