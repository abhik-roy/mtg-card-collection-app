import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CATALOG_REPOSITORY,
  CatalogCard,
  CatalogRepository,
} from '../../domain/repositories/catalog.repository';

export type GetByIdQueryInput = {
  id: string;
};

@Injectable()
export class GetByIdQuery {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: CatalogRepository,
  ) {}

  async execute(input: GetByIdQueryInput): Promise<CatalogCard> {
    const card = await this.catalogRepository.getById(input.id);
    if (!card) {
      throw new NotFoundException({
        error: {
          code: 'NOT_FOUND',
          message: `Card with id ${input.id} not found`,
        },
      });
    }
    return card;
  }
}
