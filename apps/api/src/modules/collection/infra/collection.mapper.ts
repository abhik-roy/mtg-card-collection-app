import { UniqueEntityId } from '../../../shared/domain/core/unique-entity-id';
import { CollectionEntry } from '../domain/entities/collection-entry';
import { Condition } from '../domain/value-objects/condition.vo';
import { Finish } from '../domain/value-objects/finish.vo';

type PrismaCollectionEntry = {
  id: string;
  userId: string | null;
  cardId: string;
  quantity: number;
  finish: string;
  condition: string;
  language: string;
  acquiredPrice: number | null;
  acquiredDate: Date | null;
  location: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PrismaCollectionWithCache = PrismaCollectionEntry & {
  catalogCache?: {
    name: string;
    setCode: string;
    collectorNumber: string;
    imageSmall: string | null;
    usd: number | null;
    usdFoil: number | null;
  } | null;
};

export class CollectionMapper {
  static toPrisma(entry: CollectionEntry) {
    return {
      id: entry.id.toString(),
      cardId: entry.cardId,
      quantity: entry.quantity,
      finish: entry.finish.value,
      condition: entry.condition.value,
      language: entry.language,
      userId: entry.userId,
      acquiredPrice: entry.acquiredPrice ?? null,
      acquiredDate: entry.acquiredDate ?? null,
      location: entry.location ?? null,
      notes: entry.notes ?? null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  static toDomain(record: PrismaCollectionEntry): CollectionEntry {
    if (!record.userId) {
      throw new Error(`Collection entry ${record.id} is missing user context`);
    }
    return CollectionEntry.create({
      id: UniqueEntityId.create(record.id),
      userId: record.userId,
      cardId: record.cardId,
      quantity: record.quantity,
      finish: Finish.fromPrisma(record.finish),
      condition: Condition.fromPrisma(record.condition),
      language: record.language,
      acquiredPrice: record.acquiredPrice ?? undefined,
      acquiredDate: record.acquiredDate ?? undefined,
      location: record.location ?? undefined,
      notes: record.notes ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
