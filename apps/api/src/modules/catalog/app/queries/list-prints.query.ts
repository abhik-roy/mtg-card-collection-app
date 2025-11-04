import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CATALOG_REPOSITORY,
  CatalogRepository,
  CatalogSearchResult,
} from '../../domain/repositories/catalog.repository';

export type ListCardPrintsQueryInput = {
  cardId: string;
};

@Injectable()
export class ListCardPrintsQuery {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: CatalogRepository,
  ) {}

  async execute(input: ListCardPrintsQueryInput): Promise<CatalogSearchResult> {
    try {
      return await this.catalogRepository.listPrints(input.cardId);
    } catch (error) {
      const status = (error as { status?: number } | undefined)?.status;
      if (status === 404) {
        throw new NotFoundException({
          error: {
            code: 'NOT_FOUND',
            message: `No printings found for card ${input.cardId}`,
          },
        });
      }
      throw error;
    }
  }
}
