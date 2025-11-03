import { Controller, Get, Param, Query } from '@nestjs/common';
import { SearchByNameQuery } from '../app/queries/search-by-name.query';
import { GetByIdQuery } from '../app/queries/get-by-id.query';
import {
  CatalogIdParamDto,
  SearchCatalogDto,
} from './dto/search.dto';

@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly searchByNameQuery: SearchByNameQuery,
    private readonly getByIdQuery: GetByIdQuery,
  ) {}

  @Get('search')
  async search(@Query() query: SearchCatalogDto) {
    const result = await this.searchByNameQuery.execute({
      query: query.q,
      page: query.page,
      pageSize: query.pageSize,
    });

    return {
      items: result.items.map((item) => ({
        id: item.id,
        name: item.name,
        set: item.setCode,
        collector_number: item.collectorNumber,
        lang: item.lang,
        rarity: item.rarity,
        image_uris: {
          small: item.imageSmall,
          normal: item.imageNormal,
        },
        prices: {
          usd: item.usd,
          usd_foil: item.usdFoil,
        },
      })),
      total: result.total,
      has_more: result.hasMore,
    };
  }

  @Get(':id')
  async getById(@Param() params: CatalogIdParamDto) {
    const card = await this.getByIdQuery.execute({ id: params.id });

    return {
      id: card.id,
      name: card.name,
      set: card.setCode,
      collector_number: card.collectorNumber,
      lang: card.lang,
      rarity: card.rarity,
      image_uris: {
        small: card.imageSmall,
        normal: card.imageNormal,
      },
      prices: {
        usd: card.usd,
        usd_foil: card.usdFoil,
      },
    };
  }
}
