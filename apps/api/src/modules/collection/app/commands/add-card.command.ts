import { Inject, Injectable } from '@nestjs/common';
import { UniqueEntityId } from '../../../../shared/domain/core/unique-entity-id';
import { CollectionEntry } from '../../domain/entities/collection-entry';
import {
  COLLECTION_REPOSITORY,
  CollectionRepository,
} from '../../domain/repositories/collection.repository';
import { Condition } from '../../domain/value-objects/condition.vo';
import { Finish } from '../../domain/value-objects/finish.vo';

export type AddCardCommandInput = {
  cardId: string;
  quantity: number;
  finish: string;
  condition: string;
  language?: string;
  acquiredPrice?: number;
  acquiredDate?: Date;
  location?: string;
  notes?: string;
};

export type AddCardCommandOutput = {
  id: string;
};

@Injectable()
export class AddCardCommand {
  constructor(
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: CollectionRepository,
  ) {}

  async execute(input: AddCardCommandInput): Promise<AddCardCommandOutput> {
    const entry = CollectionEntry.create({
      id: UniqueEntityId.create(),
      cardId: input.cardId,
      quantity: input.quantity,
      finish: Finish.create(input.finish),
      condition: Condition.create(input.condition),
      language: input.language ?? 'en',
      acquiredPrice: input.acquiredPrice,
      acquiredDate: input.acquiredDate,
      location: input.location,
      notes: input.notes,
    });

    await this.collectionRepository.create(entry);

    return { id: entry.id.toString() };
  }
}
