export type CatalogCard = {
  id: string;
  name: string;
  setCode: string;
  collectorNumber: string;
  lang: string;
  rarity?: string;
  colorIdentity?: string[];
  typeLine?: string;
  setType?: string;
  releasedAt?: string;
  manaValue?: number;
  legalities?: Record<string, string>;
  imageSmall?: string;
  imageNormal?: string;
  usd?: number;
  usdFoil?: number;
};

export type CatalogSearchResult = {
  items: CatalogCard[];
  hasMore?: boolean;
  total?: number;
};

export interface CatalogRepository {
  searchByNamePrefix(
    query: string,
    page: number,
    pageSize: number,
  ): Promise<CatalogSearchResult>;

  getById(id: string): Promise<CatalogCard | null>;

  listPrints(cardId: string): Promise<CatalogSearchResult>;
}

export const CATALOG_REPOSITORY = Symbol('CATALOG_REPOSITORY');
