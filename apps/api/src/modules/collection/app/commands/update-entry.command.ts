import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  COLLECTION_REPOSITORY,
  CollectionRepository,
} from '../../domain/repositories/collection.repository';
import { Condition } from '../../domain/value-objects/condition.vo';
import { Finish } from '../../domain/value-objects/finish.vo';

export type UpdateEntryCommandInput = {
  id: string;
  quantity?: number;
  finish?: string;
  condition?: string;
  language?: string;
  acquiredPrice?: number | null;
  acquiredDate?: Date | null;
  location?: string | null;
  notes?: string | null;
};

@Injectable()
export class UpdateEntryCommand {
  constructor(
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: CollectionRepository,
  ) {}

  async execute(input: UpdateEntryCommandInput): Promise<void> {
    const entry = await this.collectionRepository.findById(input.id);

    if (!entry) {
      throw new NotFoundException({
        error: {
          code: 'NOT_FOUND',
          message: `Collection entry ${input.id} not found`,
        },
      });
    }

    if (input.quantity !== undefined) {
      entry.updateQuantity(input.quantity);
    }

    entry.updateDetails({
      finish: input.finish ? Finish.create(input.finish) : undefined,
      condition: input.condition ? Condition.create(input.condition) : undefined,
      language: input.language,
      acquiredPrice:
        input.acquiredPrice === null ? undefined : input.acquiredPrice ?? undefined,
      acquiredDate:
        input.acquiredDate === null ? undefined : input.acquiredDate ?? undefined,
      location: input.location === null ? undefined : input.location ?? undefined,
      notes: input.notes === null ? undefined : input.notes ?? undefined,
    });

    await this.collectionRepository.save(entry);
  }
}
