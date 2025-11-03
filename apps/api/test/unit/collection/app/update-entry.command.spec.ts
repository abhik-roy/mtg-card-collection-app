import { NotFoundException } from '@nestjs/common';
import { UpdateEntryCommand } from '../../../../src/modules/collection/app/commands/update-entry.command';
import { CollectionEntry } from '../../../../src/modules/collection/domain/entities/collection-entry';
import { CollectionRepository } from '../../../../src/modules/collection/domain/repositories/collection.repository';
import { Condition } from '../../../../src/modules/collection/domain/value-objects/condition.vo';
import { Finish } from '../../../../src/modules/collection/domain/value-objects/finish.vo';
import { UniqueEntityId } from '../../../../src/shared/domain/core/unique-entity-id';

const buildEntry = () =>
  CollectionEntry.create({
    userId: 'user-1',
    id: UniqueEntityId.create('entry-1'),
    cardId: 'card-1',
    quantity: 3,
    finish: Finish.create('FOIL'),
    condition: Condition.create('NM'),
    language: 'en',
    acquiredPrice: 15,
    location: 'Binder',
  });

describe('UpdateEntryCommand', () => {
  const repository: jest.Mocked<CollectionRepository> = {
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    findAll: jest.fn(),
  } as unknown as jest.Mocked<CollectionRepository>;

  const command = new UpdateEntryCommand(repository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates existing entries and normalizes nullable fields', async () => {
    const entry = buildEntry();
    repository.findById.mockResolvedValue(entry);
    repository.save.mockResolvedValue(undefined as never);

    await command.execute({
      id: 'entry-1',
      userId: 'user-1',
      quantity: 5,
      finish: 'NONFOIL',
      acquiredPrice: null,
      location: null,
    });

    expect(entry.quantity).toBe(5);
    expect(entry.finish.value).toBe('NONFOIL');
    expect(entry.acquiredPrice).toBeUndefined();
    expect(entry.location).toBeUndefined();
    expect(repository.save).toHaveBeenCalledWith(entry);
  });

  it('throws when entry is not found', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      command.execute({
        id: 'missing',
        userId: 'user-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
