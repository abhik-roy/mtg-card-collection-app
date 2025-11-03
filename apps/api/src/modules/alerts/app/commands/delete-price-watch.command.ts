import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PRICE_WATCH_REPOSITORY,
  PriceWatchRepository,
} from '../../domain/repositories/price-watch.repository';

export type DeletePriceWatchCommandInput = {
  id: string;
};

@Injectable()
export class DeletePriceWatchCommand {
  constructor(
    @Inject(PRICE_WATCH_REPOSITORY)
    private readonly repository: PriceWatchRepository,
  ) {}

  async execute(input: DeletePriceWatchCommandInput): Promise<void> {
    const watch = await this.repository.findById(input.id);

    if (!watch) {
      throw new NotFoundException({
        error: {
          code: 'NOT_FOUND',
          message: `Price watch ${input.id} not found`,
        },
      });
    }

    await this.repository.delete(input.id);
  }
}
