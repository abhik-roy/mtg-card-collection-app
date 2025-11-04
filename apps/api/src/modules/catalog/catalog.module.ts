import { Module } from '@nestjs/common';
import { ScryfallClient } from '../../shared/infra/http/scryfall.client';
import { CatalogController } from './rest/catalog.controller';
import { SearchByNameQuery } from './app/queries/search-by-name.query';
import { GetByIdQuery } from './app/queries/get-by-id.query';
import { ListCardPrintsQuery } from './app/queries/list-prints.query';
import { CATALOG_REPOSITORY } from './domain/repositories/catalog.repository';
import { CatalogApiRepository } from './infra/catalog.api.repository';

@Module({
  controllers: [CatalogController],
  providers: [
    ScryfallClient,
    SearchByNameQuery,
    GetByIdQuery,
    ListCardPrintsQuery,
    {
      provide: CATALOG_REPOSITORY,
      useClass: CatalogApiRepository,
    },
  ],
  exports: [CATALOG_REPOSITORY],
})
export class CatalogModule {}
