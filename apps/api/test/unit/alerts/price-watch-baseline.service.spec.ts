import { PriceWatchBaselineService } from '../../../src/modules/alerts/app/services/price-watch-baseline.service';
import { PriceWatch } from '../../../src/modules/alerts/domain/entities/price-watch';
import type { PriceWatchRepository } from '../../../src/modules/alerts/domain/repositories/price-watch.repository';
import type { PrismaService } from '../../../src/shared/infra/prisma/prisma.service';

describe('PriceWatchBaselineService', () => {
  const prisma = {
    collectionEntry: {
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const repository: jest.Mocked<PriceWatchRepository> = {
    create: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };

  const service = new PriceWatchBaselineService(prisma, repository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates baseline watches for collection entries', async () => {
    (prisma.collectionEntry.findMany as jest.Mock).mockResolvedValue([
      {
        cardId: 'card-1',
        catalogCache: { usd: 5 },
      },
    ]);
    repository.findAll.mockResolvedValue([]);

    await service.ensureBaselineWatches();

    expect(repository.create).toHaveBeenCalledTimes(2);
    const [firstCall, secondCall] = repository.create.mock.calls;
    expect(firstCall[0].cardId).toBe('card-1');
    expect(firstCall[0].thresholdPercent).toBe(100);
    expect(secondCall[0].thresholdPercent).toBe(30);
  });

  it('skips duplicate creation when watches already exist', async () => {
    const existing = PriceWatch.create({
      cardId: 'card-1',
      direction: 'UP',
      priceType: 'USD',
      thresholdPercent: 100,
      contact: 'auto@local',
    });

    (prisma.collectionEntry.findMany as jest.Mock).mockResolvedValue([
      { cardId: 'card-1', catalogCache: { usd: 5 } },
    ]);
    repository.findAll.mockResolvedValue([existing]);

    await service.ensureBaselineWatches();

    expect(repository.create).toHaveBeenCalledTimes(1);
    const createdWatch = repository.create.mock.calls[0][0];
    expect(createdWatch.thresholdPercent).toBe(30);
  });

  it('does not create a 30% watch for low-price cards', async () => {
    (prisma.collectionEntry.findMany as jest.Mock).mockResolvedValue([
      { cardId: 'card-2', catalogCache: { usd: 1.5 } },
    ]);
    repository.findAll.mockResolvedValue([]);

    await service.ensureBaselineWatches();

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.create.mock.calls[0][0].thresholdPercent).toBe(100);
  });
});
