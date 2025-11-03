import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { Client } from 'pg';
import { ScryfallClient } from '../../src/shared/infra/http/scryfall.client';
import { ZodValidationPipe } from 'nestjs-zod';
import { ProblemDetailsFilter } from '../../src/shared/presentation/problem.filter';
import { PrismaService } from '../../src/shared/infra/prisma/prisma.service';

export type FakeScryfall = {
  searchByNamePrefix: jest.MockedFunction<ScryfallClient['searchByNamePrefix']>;
  getById: jest.MockedFunction<ScryfallClient['getById']>;
  findByName: jest.MockedFunction<ScryfallClient['findByName']>;
};

export type TestApp = {
  app: INestApplication;
  fakeScryfall: FakeScryfall;
  databaseUrl: string;
  close: () => Promise<void>;
};

export async function createTestApp(): Promise<TestApp> {
  const previousDbUrl = process.env.DATABASE_URL;
  const baseUrl = new URL(previousDbUrl ?? 'postgresql://mtg:mtg@localhost:5432/mtg');
  const adminUrl = new URL(baseUrl.toString());
  adminUrl.pathname = '/postgres';

  const testDbName = `mtg_test_${randomUUID().replace(/-/g, '')}`;
  const testDbUrl = new URL(baseUrl.toString());
  testDbUrl.pathname = `/${testDbName}`;

  const adminClient = new Client({ connectionString: adminUrl.toString() });
  await adminClient.connect();
  await adminClient.query(`CREATE DATABASE "${testDbName}"`);
  await adminClient.end();

  process.env.DATABASE_URL = testDbUrl.toString();
  const previousJwtSecret = process.env.JWT_SECRET;
  const previousJwtExpires = process.env.JWT_EXPIRES_IN;
  const previousSaltRounds = process.env.BCRYPT_SALT_ROUNDS;
  const previousAllowedOrigins = process.env.ALLOWED_ORIGINS;
  const previousRateLimitTtl = process.env.RATE_LIMIT_TTL;
  const previousRateLimitMax = process.env.RATE_LIMIT_MAX;
  process.env.JWT_SECRET = previousJwtSecret ?? 'test-secret';
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '1h';
  process.env.BCRYPT_SALT_ROUNDS = '4';
  process.env.ALLOWED_ORIGINS = previousAllowedOrigins ?? 'http://localhost:5173';
  process.env.RATE_LIMIT_TTL = previousRateLimitTtl ?? '60';
  process.env.RATE_LIMIT_MAX = previousRateLimitMax ?? '120';

  const projectRoot = path.resolve(__dirname, '../../');
  const prismaBinary =
    process.platform === 'win32'
      ? path.resolve(projectRoot, 'node_modules/.bin/prisma.cmd')
      : path.resolve(projectRoot, 'node_modules/.bin/prisma');

  try {
    execFileSync(prismaBinary, ['migrate', 'deploy', '--schema', 'prisma/schema.prisma'], {
      cwd: projectRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: testDbUrl.toString(),
      },
    });
  } catch (error) {
    console.error('Failed to run prisma migrate', error);
    throw error;
  }

  const { fakeScryfall } = createFakeScryfall();
  const { AppModule } = await import('../../src/app.module');

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

  const prisma = app.get(PrismaService);
  await prisma.priceWatch.deleteMany({});
  await prisma.collectionEntry.deleteMany({});

  const close = async () => {
    await app.close();
    if (previousDbUrl !== undefined) {
      process.env.DATABASE_URL = previousDbUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
    if (previousJwtSecret !== undefined) {
      process.env.JWT_SECRET = previousJwtSecret;
    } else {
      delete process.env.JWT_SECRET;
    }
    if (previousJwtExpires !== undefined) {
      process.env.JWT_EXPIRES_IN = previousJwtExpires;
    } else {
      delete process.env.JWT_EXPIRES_IN;
    }
    if (previousSaltRounds !== undefined) {
      process.env.BCRYPT_SALT_ROUNDS = previousSaltRounds;
    } else {
      delete process.env.BCRYPT_SALT_ROUNDS;
    }
    if (previousAllowedOrigins !== undefined) {
      process.env.ALLOWED_ORIGINS = previousAllowedOrigins;
    } else {
      delete process.env.ALLOWED_ORIGINS;
    }
    if (previousRateLimitTtl !== undefined) {
      process.env.RATE_LIMIT_TTL = previousRateLimitTtl;
    } else {
      delete process.env.RATE_LIMIT_TTL;
    }
    if (previousRateLimitMax !== undefined) {
      process.env.RATE_LIMIT_MAX = previousRateLimitMax;
    } else {
      delete process.env.RATE_LIMIT_MAX;
    }
    const dropClient = new Client({ connectionString: adminUrl.toString() });
    await dropClient.connect();
    await dropClient.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1', [testDbName]);
    await dropClient.query(`DROP DATABASE "${testDbName}"`);
    await dropClient.end();
  };

  return {
    app,
    fakeScryfall,
    databaseUrl: testDbUrl.toString(),
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
