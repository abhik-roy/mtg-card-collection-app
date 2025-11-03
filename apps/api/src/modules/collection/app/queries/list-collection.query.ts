import { Inject, Injectable } from '@nestjs/common';
import {
  COLLECTION_REPOSITORY,
  CollectionListResult,
  CollectionRepository,
} from '../../domain/repositories/collection.repository';

export type ListCollectionQueryInput = {
  userId: string;
  q?: string;
  set?: string;
  page?: number;
  pageSize?: number;
};

@Injectable()
export class ListCollectionQuery {
  constructor(
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: CollectionRepository,
  ) {}

  execute(input: ListCollectionQueryInput): Promise<CollectionListResult> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const pageSize = input.pageSize && input.pageSize > 0 ? input.pageSize : 24;

    return this.collectionRepository.list({
      userId: input.userId,
      q: input.q,
      setCode: input.set,
      page,
      pageSize,
    });
  }
}
