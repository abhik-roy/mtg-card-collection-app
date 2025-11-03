import { CollectionEntry } from '../entities/collection-entry';

export type CollectionListQuery = {
  q?: string;
  setCode?: string;
  page: number;
  pageSize: number;
};

export type CollectionListItem = {
  id: string;
  cardId: string;
  quantity: number;
  finish: string;
  condition: string;
  language: string;
  location?: string;
  name: string;
  setCode: string;
  collectorNumber: string;
  imageSmall?: string;
  usd?: number;
  usdFoil?: number;
};

export type CollectionListResult = {
  items: CollectionListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export interface CollectionRepository {
  create(entry: CollectionEntry): Promise<void>;
  save(entry: CollectionEntry): Promise<void>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<CollectionEntry | null>;
  list(query: CollectionListQuery): Promise<CollectionListResult>;
  findAll(query: Omit<CollectionListQuery, 'page' | 'pageSize'>): Promise<CollectionListItem[]>;
}

export const COLLECTION_REPOSITORY = Symbol('COLLECTION_REPOSITORY');
