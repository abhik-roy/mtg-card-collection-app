import { Inject, Injectable, Logger } from '@nestjs/common';
import { ScryfallClient } from '../../../../shared/infra/http/scryfall.client';
import { CollectionEntry } from '../../domain/entities/collection-entry';
import { Finish } from '../../domain/value-objects/finish.vo';
import { Condition } from '../../domain/value-objects/condition.vo';
import {
  COLLECTION_REPOSITORY,
  CollectionRepository,
} from '../../domain/repositories/collection.repository';
import {
  ParsedImportItem,
  SupportedImportFormat,
  parseCollectionImport,
} from '../importers/collection.importer';

export type ImportCollectionCommandInput = {
  payload: string;
  format?: SupportedImportFormat;
};

export type ImportFailure = {
  raw: string;
  reason: string;
};

export type ImportCollectionCommandOutput = {
  imported: number;
  failures: ImportFailure[];
};

@Injectable()
export class ImportCollectionCommand {
  private readonly logger = new Logger(ImportCollectionCommand.name);

  constructor(
    @Inject(COLLECTION_REPOSITORY)
    private readonly repository: CollectionRepository,
    private readonly scryfallClient: ScryfallClient,
  ) {}

  async execute(input: ImportCollectionCommandInput): Promise<ImportCollectionCommandOutput> {
    const format = input.format ?? 'auto';
    const parsed = parseCollectionImport(input.payload, format);

    const failures: ImportFailure[] = [];
    let imported = 0;

    for (const item of parsed) {
      try {
        await this.importItem(item);
        imported += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error while importing entry';
        this.logger.warn(`Failed to import line "${item.raw}": ${message}`);
        failures.push({ raw: item.raw, reason: message });
      }
    }

    return {
      imported,
      failures,
    };
  }

  private async importItem(item: ParsedImportItem): Promise<void> {
    const card = await this.scryfallClient.findByName(item.name, item.setCode);

    const finishValue = (item.finish ?? 'NONFOIL').toUpperCase();
    const conditionValue = (item.condition ?? 'NM').toUpperCase();

    const entry = CollectionEntry.create({
      cardId: card.id,
      quantity: item.quantity,
      finish: Finish.create(finishValue),
      condition: Condition.create(conditionValue),
      language: (item.language ?? card.lang ?? 'en').toLowerCase(),
      location: item.location,
      notes: undefined,
    });

    await this.repository.create(entry);
  }
}
