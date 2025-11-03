import { Inject, Injectable } from '@nestjs/common';
import {
  PRICE_WATCH_REPOSITORY,
  PriceWatchRepository,
} from '../../domain/repositories/price-watch.repository';
import { PriceWatch } from '../../domain/entities/price-watch';

@Injectable()
export class ListPriceWatchesQuery {
  constructor(
    @Inject(PRICE_WATCH_REPOSITORY)
    private readonly repository: PriceWatchRepository,
  ) {}

  execute(): Promise<PriceWatch[]> {
    return this.repository.findAll();
  }
}
