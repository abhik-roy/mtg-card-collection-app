import { Inject, Injectable } from '@nestjs/common';
import {
  CATALOG_REPOSITORY,
  CatalogRepository,
  CatalogSearchResult,
} from '../../domain/repositories/catalog.repository';

export type SearchByNameQueryInput = {
  query: string;
  page?: number;
  pageSize?: number;
};

@Injectable()
export class SearchByNameQuery {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: CatalogRepository,
  ) {}

  execute(input: SearchByNameQueryInput): Promise<CatalogSearchResult> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const pageSize = input.pageSize && input.pageSize > 0 ? input.pageSize : 24;
    return this.catalogRepository.searchByNamePrefix(input.query, page, pageSize);
  }
}
