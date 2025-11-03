import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CreatePriceWatchCommand } from '../app/commands/create-price-watch.command';
import { DeletePriceWatchCommand } from '../app/commands/delete-price-watch.command';
import { ListPriceWatchesQuery } from '../app/queries/list-price-watches.query';
import { CreateWatchDto } from './dto/create-watch.dto';
import { WatchIdParamDto } from './dto/watch-id.dto';
import { PriceWatchBaselineService } from '../app/services/price-watch-baseline.service';

@Controller('alerts')
export class AlertsController {
  constructor(
    private readonly createPriceWatchCommand: CreatePriceWatchCommand,
    private readonly deletePriceWatchCommand: DeletePriceWatchCommand,
    private readonly listPriceWatchesQuery: ListPriceWatchesQuery,
    private readonly priceWatchBaselineService: PriceWatchBaselineService,
  ) {}

  @Post()
  async create(@Body() payload: CreateWatchDto) {
    return this.createPriceWatchCommand.execute(payload);
  }

  @Get()
  async list() {
    await this.priceWatchBaselineService.ensureBaselineWatches();
    const watches = await this.listPriceWatchesQuery.execute();
    return {
      items: watches.map((watch) => ({
        id: watch.id.toString(),
        cardId: watch.cardId,
        direction: watch.direction,
        priceType: watch.priceType,
        thresholdPercent: watch.thresholdPercent,
        contact: watch.contact,
        lastPrice: watch.lastPrice ?? null,
        lastNotifiedAt: watch.lastNotifiedAt ?? null,
        createdAt: watch.createdAt.toISOString(),
        updatedAt: watch.updatedAt.toISOString(),
      })),
    };
  }

  @Delete(':id')
  async delete(@Param() params: WatchIdParamDto) {
    await this.deletePriceWatchCommand.execute({ id: params.id });
    return { ok: true };
  }
}
