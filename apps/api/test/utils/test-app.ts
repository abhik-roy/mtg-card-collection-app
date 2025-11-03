import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { existsSync, mkdtempSync, copyFileSync, unlinkSync, rmSync } from 'fs';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import * as path from 'path';
import { AppModule } from '../../src/app.module';
import { ScryfallClient } from '../../src/shared/infra/http/scryfall.client';
import { ZodValidationPipe } from 'nestjs-zod';
import { ProblemDetailsFilter } from '../../src/shared/presentation/problem.filter';

export type FakeScryfall = {
  searchByNamePrefix: jest.MockedFunction<ScryfallClient['searchByNamePrefix']>;
  getById: jest.MockedFunction<ScryfallClient['getById']>;
  findByName: jest.MockedFunction<ScryfallClient['findByName']>;
};

export type TestApp = {
  app: INestApplication;
  fakeScryfall: FakeScryfall;
  dbPath: string;
  close: () => Promise<void>;
};

export async function createTestApp(
  seedDbPath = path.resolve(__dirname, '../../dev.sqlite'),
): Promise<TestApp> {
  const previousDbUrl = process.env.DATABASE_URL;
  const tempDir = mkdtempSync(path.join(tmpdir(), 'mtg-tests-'));
  const dbPath = path.join(tempDir, `test-db-${randomUUID()}.sqlite`);
  copyFileSync(seedDbPath, dbPath);
  process.env.DATABASE_URL = `file:${dbPath}`;

  const { fakeScryfall } = createFakeScryfall();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ScryfallClient)
    .useValue(fakeScryfall)
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new ProblemDetailsFilter());
  await app.init();

  const close = async () => {
    await app.close();
    if (previousDbUrl !== undefined) {
      process.env.DATABASE_URL = previousDbUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
    try {
      if (existsSync(dbPath)) unlinkSync(dbPath);
      rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // ignore cleanup errors
    }
  };

  return {
    app,
    fakeScryfall,
    dbPath,
    close,
  };
}

function createFakeScryfall() {
  const cards = [
    {
      id: 'stormchaser-talent-001',
      name: "Stormchaser's Talent",
      set: 'blb',
      collector_number: '75',
      lang: 'en',
      image_uris: { small: 'https://example.com/stormchaser-small.jpg' },
      prices: { usd: '1.73', usd_foil: '4.00' },
    },
    {
      id: 'lose-focus-001',
      name: 'Lose Focus',
      set: 'mh2',
      collector_number: '75',
      lang: 'en',
      image_uris: { small: 'https://example.com/lose-focus-small.jpg' },
      prices: { usd: '0.14', usd_foil: '0.35' },
    },
  ];

  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const cardsByName = new Map(cards.map((card) => [card.name.toLowerCase(), card]));

  const fakeScryfall: FakeScryfall = {
    searchByNamePrefix: jest.fn(async (query: string) => {
      const normalized = query.replace(/name:/i, '').replace('*', '').trim().toLowerCase();
      const matches = cards.filter((card) => card.name.toLowerCase().includes(normalized));
      return {
        data: matches.length > 0 ? matches : cards,
        has_more: false,
        total_cards: matches.length,
      };
    }),
    getById: jest.fn(async (id: string) => {
      const card = cardsById.get(id);
      if (!card) throw new Error(`Unknown card id ${id}`);
      return card;
    }),
    findByName: jest.fn(async (name: string, setCode?: string) => {
      const card = cardsByName.get(name.toLowerCase());
      if (!card) throw new Error(`Unknown card name ${name}`);
      if (setCode && card.set.toLowerCase() !== setCode.toLowerCase()) {
        throw new Error(`Card ${name} does not belong to set ${setCode}`);
      }
      return card;
    }),
  };

  return { fakeScryfall };
}
