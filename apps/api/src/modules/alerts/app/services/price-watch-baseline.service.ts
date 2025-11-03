import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infra/prisma/prisma.service';
import { PriceWatch } from '../../domain/entities/price-watch';
import {
  PRICE_WATCH_REPOSITORY,
  PriceWatchRepository,
} from '../../domain/repositories/price-watch.repository';

const BASELINE_CONTACT = 'auto@local';

@Injectable()
export class PriceWatchBaselineService {
  private readonly logger = new Logger(PriceWatchBaselineService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PRICE_WATCH_REPOSITORY)
    private readonly priceWatchRepository: PriceWatchRepository,
  ) {}

  async ensureBaselineWatches(): Promise<void> {
    const [collectionEntries, existingWatches] = await Promise.all([
      this.prisma.collectionEntry.findMany({
        include: {
          catalogCache: true,
        },
      }),
      this.priceWatchRepository.findAll(),
    ]);

    const watchKey = (watch: PriceWatch) =>
      `${watch.cardId}::${watch.thresholdPercent}::${watch.direction}::${watch.priceType}`;

    const existingKeys = new Set(existingWatches.map((watch) => watchKey(watch)));

    for (const entry of collectionEntries) {
      const cardId = entry.cardId;
      await this.ensureWatch(cardId, 100, 'UP', 'USD', existingKeys);

      const price = entry.catalogCache?.usd ?? undefined;
      if (price !== undefined && price > 2) {
        await this.ensureWatch(cardId, 30, 'UP', 'USD', existingKeys);
      }
    }
  }

  private async ensureWatch(
    cardId: string,
    thresholdPercent: number,
    direction: 'UP' | 'DOWN',
    priceType: 'USD' | 'USD_FOIL',
    existingKeys: Set<string>,
  ): Promise<void> {
    const provisional = PriceWatch.create({
      cardId,
      direction,
      priceType,
      thresholdPercent,
      contact: BASELINE_CONTACT,
    });

    const key = `${cardId}::${thresholdPercent}::${direction}::${priceType}`;
    if (existingKeys.has(key)) {
      return;
    }

    try {
      await this.priceWatchRepository.create(provisional);
      existingKeys.add(key);
    } catch (error) {
      this.logger.warn(
        `Failed to create baseline watch for ${cardId} (${thresholdPercent}% ${direction} ${priceType}): ${(error as Error).message}`,
      );
    }
  }
}
