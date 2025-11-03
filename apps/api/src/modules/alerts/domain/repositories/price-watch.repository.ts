import { PriceWatch } from '../entities/price-watch';

export interface PriceWatchRepository {
  create(watch: PriceWatch): Promise<void>;
  save(watch: PriceWatch): Promise<void>;
  delete(id: string): Promise<void>;
  findAll(): Promise<PriceWatch[]>;
  findById(id: string): Promise<PriceWatch | null>;
}

export const PRICE_WATCH_REPOSITORY = Symbol('PRICE_WATCH_REPOSITORY');
