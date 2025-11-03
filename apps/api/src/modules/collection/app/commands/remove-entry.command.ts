import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  COLLECTION_REPOSITORY,
  CollectionRepository,
} from '../../domain/repositories/collection.repository';

export type RemoveEntryCommandInput = {
  id: string;
};

@Injectable()
export class RemoveEntryCommand {
  constructor(
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: CollectionRepository,
  ) {}

  async execute(input: RemoveEntryCommandInput): Promise<void> {
    const entry = await this.collectionRepository.findById(input.id);
    if (!entry) {
      throw new NotFoundException({
        error: {
          code: 'NOT_FOUND',
          message: `Collection entry ${input.id} not found`,
        },
      });
    }

    await this.collectionRepository.delete(input.id);
  }
}
