import { CollectionEntry } from '../../../../src/modules/collection/domain/entities/collection-entry';
import { Condition } from '../../../../src/modules/collection/domain/value-objects/condition.vo';
import { Finish } from '../../../../src/modules/collection/domain/value-objects/finish.vo';
import { UniqueEntityId } from '../../../../src/shared/domain/core/unique-entity-id';

const createEntry = () =>
  CollectionEntry.create({
    userId: 'user-1',
    id: UniqueEntityId.create('entry-1'),
    cardId: 'card-1',
    quantity: 2,
    finish: Finish.create('FOIL'),
    condition: Condition.create('NM'),
    language: 'en',
    location: 'Binder',
    notes: 'Signed',
    acquiredPrice: 10,
  });

describe('CollectionEntry', () => {
  it('rejects negative quantities on creation', () => {
    expect(() =>
      CollectionEntry.create({
        userId: 'user-1',
        cardId: 'card-1',
        quantity: -1,
        finish: Finish.create('FOIL'),
        condition: Condition.create('NM'),
        language: 'en',
      }),
    ).toThrow('Quantity must be >= 0');
  });

  it('updates quantity and timestamps', () => {
    const entry = createEntry();
    const previousUpdatedAt = entry.updatedAt;

    entry.updateQuantity(5);

    expect(entry.quantity).toBe(5);
    expect(entry.updatedAt.getTime()).toBeGreaterThanOrEqual(previousUpdatedAt.getTime());
  });

  it('updates optional details', () => {
    const entry = createEntry();

    entry.updateDetails({
      finish: Finish.create('NONFOIL'),
      condition: Condition.create('LP'),
      language: 'jp',
      acquiredPrice: 12,
      location: 'Vault',
      notes: 'Foil promo',
    });

    expect(entry.finish.value).toBe('NONFOIL');
    expect(entry.condition.value).toBe('LP');
    expect(entry.language).toBe('jp');
    expect(entry.location).toBe('Vault');
    expect(entry.notes).toBe('Foil promo');
    expect(entry.acquiredPrice).toBe(12);
  });

  it('prevents negative quantity during update', () => {
    const entry = createEntry();

    expect(() => entry.updateQuantity(-1)).toThrow('Quantity must be >= 0');
    expect(() =>
      entry.updateDetails({
        quantity: -5,
      } as any),
    ).toThrow('Quantity must be >= 0');
  });
});
