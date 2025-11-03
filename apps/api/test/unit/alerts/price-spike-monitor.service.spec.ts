import { PriceSpikeMonitorService } from '../../../src/modules/alerts/app/services/price-spike-monitor.service';
import { PriceWatch } from '../../../src/modules/alerts/domain/entities/price-watch';
import { PriceWatchRepository } from '../../../src/modules/alerts/domain/repositories/price-watch.repository';
import { UniqueEntityId } from '../../../src/shared/domain/core/unique-entity-id';

const createWatch = (overrides: Partial<Parameters<typeof PriceWatch.create>[0]> = {}) =>
  PriceWatch.create({
    cardId: overrides?.cardId ?? 'abc-123',
    direction: overrides?.direction ?? 'UP',
    priceType: overrides?.priceType ?? 'USD',
    thresholdPercent: overrides?.thresholdPercent ?? 10,
    contact: overrides?.contact ?? 'alerts@example.com',
    lastPrice: overrides?.lastPrice,
    lastNotifiedAt: overrides?.lastNotifiedAt,
    createdAt: overrides?.createdAt,
    updatedAt: overrides?.updatedAt,
    id: overrides?.id ?? UniqueEntityId.create(),
  });

describe('PriceSpikeMonitorService', () => {
  const repository = {
    findAll: jest.fn<ReturnType<PriceWatchRepository['findAll']>, Parameters<PriceWatchRepository['findAll']>>(),
    save: jest.fn<ReturnType<PriceWatchRepository['save']>, Parameters<PriceWatchRepository['save']>>(),
    create: jest.fn(),
    delete: jest.fn(),
    findById: jest.fn(),
  } as unknown as jest.Mocked<PriceWatchRepository>;

  const scryfallClient = {
    getById: jest.fn(),
  };

  const notificationGateway = {
    notifySpike: jest.fn(),
  };

  const service = new PriceSpikeMonitorService(
    repository,
    scryfallClient as any,
    notificationGateway,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.save.mockResolvedValue(undefined as never);
    repository.findAll.mockResolvedValue([]);
    notificationGateway.notifySpike.mockResolvedValue(undefined as never);
  });

  it('records baseline price without sending notification', async () => {
    const watch = createWatch({ lastPrice: undefined });
    repository.findAll.mockResolvedValueOnce([watch]);
    scryfallClient.getById.mockResolvedValueOnce({
      prices: { usd: '12.00', usd_foil: '20.00' },
      name: 'Lightning Bolt',
      set: '2ED',
      collector_number: '150',
    });

    await service.checkForSpikes();

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(watch.lastPrice).toBe(12);
    expect(notificationGateway.notifySpike).not.toHaveBeenCalled();
  });

  it('notifies when price increases beyond threshold', async () => {
    const watch = createWatch({ lastPrice: 10, thresholdPercent: 10 });
    repository.findAll.mockResolvedValueOnce([watch]);
    scryfallClient.getById.mockResolvedValueOnce({
      prices: { usd: '12.50', usd_foil: '25.00' },
      name: 'Lightning Bolt',
      set: '2ED',
      collector_number: '150',
    });

    await service.checkForSpikes();

    expect(notificationGateway.notifySpike).toHaveBeenCalledTimes(1);
    const payload = notificationGateway.notifySpike.mock.calls[0][0];
    expect(payload.currentPrice).toBe(12.5);
    expect(payload.previousPrice).toBe(10);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(watch.lastNotifiedAt).toBeInstanceOf(Date);
  });

  it('handles price decreases when direction is DOWN', async () => {
    const watch = createWatch({ lastPrice: 20, direction: 'DOWN', thresholdPercent: 15 });
    repository.findAll.mockResolvedValueOnce([watch]);
    scryfallClient.getById.mockResolvedValueOnce({
      prices: { usd: '16.00', usd_foil: '18.00' },
      name: 'Brainstorm',
      set: 'ICE',
      collector_number: '73',
    });

    await service.checkForSpikes();

    expect(notificationGateway.notifySpike).toHaveBeenCalledTimes(1);
    const payload = notificationGateway.notifySpike.mock.calls[0][0];
    expect(payload.currentPrice).toBe(16);
    expect(payload.previousPrice).toBe(20);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });
});
