import { Inject, Injectable } from '@nestjs/common';
import { UniqueEntityId } from '../../../../shared/domain/core/unique-entity-id';
import { PriceWatch, PriceDirection, PriceType } from '../../domain/entities/price-watch';
import {
  PRICE_WATCH_REPOSITORY,
  PriceWatchRepository,
} from '../../domain/repositories/price-watch.repository';

export type CreatePriceWatchCommandInput = {
  cardId: string;
  direction: PriceDirection;
  priceType: PriceType;
  thresholdPercent: number;
  contact: string;
};

@Injectable()
export class CreatePriceWatchCommand {
  constructor(
    @Inject(PRICE_WATCH_REPOSITORY)
    private readonly repository: PriceWatchRepository,
  ) {}

  async execute(input: CreatePriceWatchCommandInput): Promise<{ id: string }> {
    const watch = PriceWatch.create({
      id: UniqueEntityId.create(),
      cardId: input.cardId,
      direction: input.direction,
      priceType: input.priceType,
      thresholdPercent: input.thresholdPercent,
      contact: input.contact,
    });

    await this.repository.create(watch);

    return { id: watch.id.toString() };
  }
}
