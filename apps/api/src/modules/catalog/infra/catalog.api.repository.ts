import { Injectable, Logger } from '@nestjs/common';
import {
  CatalogRepository,
  CatalogSearchResult,
} from '../domain/repositories/catalog.repository';
import { ScryfallClient } from '../../../shared/infra/http/scryfall.client';
import { CatalogMapper } from './catalog.mapper';

@Injectable()
export class CatalogApiRepository implements CatalogRepository {
  private readonly logger = new Logger(CatalogApiRepository.name);

  constructor(private readonly scryfallClient: ScryfallClient) {}

  async searchByNamePrefix(
    query: string,
    page: number,
    pageSize: number,
  ): Promise<CatalogSearchResult> {
    const response = await this.scryfallClient.searchByNamePrefix(query, page, pageSize);

    const items = response.data.map(CatalogMapper.toDomain);

    return {
      items,
      hasMore: response.has_more,
      total: response.total_cards,
    };
  }

  async getById(id: string) {
    try {
      const card = await this.scryfallClient.getById(id);
      return CatalogMapper.toDomain(card);
    } catch (error) {
      this.logger.warn(`Unable to fetch card ${id}: ${(error as Error).message}`);
      return null;
    }
  }
}
