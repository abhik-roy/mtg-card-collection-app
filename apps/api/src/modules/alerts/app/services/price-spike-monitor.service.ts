import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScryfallClient } from '../../../../shared/infra/http/scryfall.client';
import { PriceWatch } from '../../domain/entities/price-watch';
import {
  PRICE_WATCH_REPOSITORY,
  PriceWatchRepository,
} from '../../domain/repositories/price-watch.repository';
import {
  NOTIFICATION_GATEWAY,
  NotificationGateway,
  NotificationPayload,
} from '../../infra/notification.gateway';

@Injectable()
export class PriceSpikeMonitorService {
  private readonly logger = new Logger(PriceSpikeMonitorService.name);

  constructor(
    @Inject(PRICE_WATCH_REPOSITORY)
    private readonly repository: PriceWatchRepository,
    private readonly scryfallClient: ScryfallClient,
    @Inject(NOTIFICATION_GATEWAY)
    private readonly notificationGateway: NotificationGateway,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron(): Promise<void> {
    await this.checkForSpikes();
  }

  async checkForSpikes(): Promise<void> {
    const watches = await this.repository.findAll();

    for (const watch of watches) {
      try {
        await this.evaluateWatch(watch);
      } catch (error) {
        this.logger.error(
          `Failed to evaluate watch ${watch.id.toString()}: ${(error as Error).message}`,
        );
      }
    }
  }

  private async evaluateWatch(watch: PriceWatch): Promise<void> {
    const card = await this.scryfallClient.getById(watch.cardId);
    const currentPrice = this.resolvePrice(card, watch.priceType);

    if (currentPrice === null) {
      this.logger.debug(`No price information for card ${watch.cardId}`);
      return;
    }

    const lastPrice = watch.lastPrice ?? currentPrice;

    if (!watch.lastPrice) {
      watch.updateLastPrice(currentPrice);
      await this.repository.save(watch);
      return;
    }

    if (lastPrice <= 0) {
      watch.updateLastPrice(currentPrice);
      await this.repository.save(watch);
      return;
    }

    const changePercent = ((currentPrice - lastPrice) / lastPrice) * 100;
    const isIncrease = changePercent >= watch.thresholdPercent && watch.direction === 'UP';
    const isDecrease = changePercent <= -watch.thresholdPercent && watch.direction === 'DOWN';

    if (isIncrease || isDecrease) {
      await this.notifySpike(watch, currentPrice, lastPrice, card.name, card.set, card.collector_number);
      watch.markNotified(currentPrice);
      await this.repository.save(watch);
      return;
    }

    watch.updateLastPrice(currentPrice);
    await this.repository.save(watch);
  }

  private async notifySpike(
    watch: PriceWatch,
    currentPrice: number,
    previousPrice: number,
    cardName: string,
    setCode: string,
    collectorNumber: string,
  ) {
    const payload: NotificationPayload = {
      watch,
      currentPrice,
      previousPrice,
      cardName,
      setCode,
      collectorNumber,
    };

    await this.notificationGateway.notifySpike(payload);
  }

  private resolvePrice(card: any, priceType: PriceWatch['priceType']): number | null {
    const value = priceType === 'USD' ? card.prices?.usd : card.prices?.usd_foil;
    if (!value) {
      return null;
    }
    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) {
      return null;
    }
    return numberValue;
  }
}
