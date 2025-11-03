import { ImportCollectionCommand } from '../../../src/modules/collection/app/commands/import-collection.command';
import { CollectionRepository } from '../../../src/modules/collection/domain/repositories/collection.repository';
import { ScryfallCard } from '../../../src/shared/infra/http/scryfall.client';
import type { ScryfallClient } from '../../../src/shared/infra/http/scryfall.client';

const mockCard = (overrides: Partial<ScryfallCard> = {}): ScryfallCard => ({
  id: 'card-123',
  name: 'Sample Card',
  set: 'abc',
  collector_number: '123',
  lang: 'en',
  image_uris: {},
  card_faces: [],
  prices: { usd: '1.00', usd_foil: '2.00' },
  ...overrides,
});

describe('ImportCollectionCommand', () => {
  const repository: jest.Mocked<CollectionRepository> = {
    create: jest.fn().mockResolvedValue(undefined),
    save: jest.fn(),
    delete: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    findAll: jest.fn(),
  } as unknown as jest.Mocked<CollectionRepository>;

  const scryfallClient = {
    findByName: jest.fn(),
  } as unknown as ScryfallClient;

  const command = new ImportCollectionCommand(repository, scryfallClient as any);

  beforeEach(() => {
    jest.clearAllMocks();
    (scryfallClient.findByName as jest.Mock).mockResolvedValue(mockCard());
  });

  it('imports entries successfully', async () => {
    const result = await command.execute({
      payload: '2 Lightning Bolt (2ED) 150 [FOIL]',
    });

    expect(result.imported).toBe(1);
    expect(result.failures).toHaveLength(0);
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(scryfallClient.findByName).toHaveBeenCalledWith('Lightning Bolt', '2ED');
  });

  it('records failures when Scryfall lookup fails', async () => {
    (scryfallClient.findByName as jest.Mock).mockRejectedValueOnce(new Error('not found'));

    const result = await command.execute({
      payload: '1 Missing Card',
    });

    expect(result.imported).toBe(0);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].raw).toBe('1 Missing Card');
  });
});
