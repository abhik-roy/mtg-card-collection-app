import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { AddCardCommand } from '../app/commands/add-card.command';
import { RemoveEntryCommand } from '../app/commands/remove-entry.command';
import { UpdateEntryCommand } from '../app/commands/update-entry.command';
import { ListCollectionQuery } from '../app/queries/list-collection.query';
import { ExportCollectionQuery } from '../app/queries/export-collection.query';
import { ImportCollectionCommand } from '../app/commands/import-collection.command';
import { AddCollectionEntryDto } from './dto/add-entry.dto';
import {
  CollectionIdParamDto,
  UpdateCollectionEntryDto,
} from './dto/update-entry.dto';
import { ListCollectionQueryDto } from './dto/list-query.dto';
import { ExportCollectionQueryDto } from './dto/export.dto';
import { ImportCollectionDto } from './dto/import.dto';

@Controller('collection')
export class CollectionController {
  constructor(
    private readonly addCardCommand: AddCardCommand,
    private readonly updateEntryCommand: UpdateEntryCommand,
    private readonly removeEntryCommand: RemoveEntryCommand,
    private readonly listCollectionQuery: ListCollectionQuery,
    private readonly exportCollectionQuery: ExportCollectionQuery,
    private readonly importCollectionCommand: ImportCollectionCommand,
  ) {}

  @Post()
  async add(@Body() payload: AddCollectionEntryDto) {
    const result = await this.addCardCommand.execute({
      cardId: payload.cardId,
      quantity: payload.quantity,
      finish: payload.finish,
      condition: payload.condition,
      language: payload.language,
      acquiredPrice: payload.acquiredPrice,
      acquiredDate: payload.acquiredDate ? new Date(payload.acquiredDate) : undefined,
      location: payload.location,
      notes: payload.notes,
    });

    return {
      id: result.id,
    };
  }

  @Patch(':id')
  async update(
    @Param() params: CollectionIdParamDto,
    @Body() payload: UpdateCollectionEntryDto,
  ) {
    await this.updateEntryCommand.execute({
      id: params.id,
      quantity: payload.quantity,
      finish: payload.finish,
      condition: payload.condition,
      language: payload.language,
      acquiredPrice: payload.acquiredPrice === null ? null : payload.acquiredPrice,
      acquiredDate:
        payload.acquiredDate === undefined
          ? undefined
          : payload.acquiredDate === null
            ? null
            : new Date(payload.acquiredDate),
      location: payload.location === null ? null : payload.location,
      notes: payload.notes === null ? null : payload.notes,
    });

    return { ok: true };
  }

  @Delete(':id')
  async remove(@Param() params: CollectionIdParamDto) {
    await this.removeEntryCommand.execute({ id: params.id });
    return { ok: true };
  }

  @Get()
  async list(@Query() query: ListCollectionQueryDto) {
    const result = await this.listCollectionQuery.execute({
      q: query.q,
      set: query.set,
      page: query.page,
      pageSize: query.pageSize,
    });

    return {
      items: result.items,
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    };
  }

  @Get('export')
  async export(@Query() query: ExportCollectionQueryDto) {
    const result = await this.exportCollectionQuery.execute({
      format: query.format,
      includePrices: query.includePrices,
      filters: {
        q: query.q,
        setCode: query.set,
      },
    });

    return new StreamableFile(result.content, {
      type: result.contentType,
      disposition: `attachment; filename="${result.filename}"`,
    });
  }

  @Post('import')
  async import(@Body() payload: ImportCollectionDto) {
    const result = await this.importCollectionCommand.execute({
      payload: payload.payload,
      format: payload.format,
    });

    return result;
  }
}
