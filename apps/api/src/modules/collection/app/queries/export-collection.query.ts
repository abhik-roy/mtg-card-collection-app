import { Inject, Injectable } from '@nestjs/common';
import {
  COLLECTION_REPOSITORY,
  CollectionRepository,
} from '../../domain/repositories/collection.repository';
import {
  CollectionExportFormat,
  CollectionExportOptions,
  CollectionExportResult,
  exportCollection,
} from '../exporters/collection.exporter';

export type ExportCollectionQueryFilters = {
  q?: string;
  setCode?: string;
};

export type ExportCollectionQueryInput = {
  format: CollectionExportFormat;
  includePrices?: boolean;
  filters?: ExportCollectionQueryFilters;
};

@Injectable()
export class ExportCollectionQuery {
  constructor(
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: CollectionRepository,
  ) {}

  async execute(input: ExportCollectionQueryInput): Promise<CollectionExportResult> {
    const filters = input.filters ?? {};
    const items = await this.collectionRepository.findAll({
      q: filters.q,
      setCode: filters.setCode,
    });

    const options: CollectionExportOptions = {
      includePrices: input.includePrices,
    };

    return exportCollection(input.format, items, options);
  }
}
