import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/infra/prisma/prisma.service';
import { ScryfallClient } from '../../shared/infra/http/scryfall.client';
import { AddCardCommand } from './app/commands/add-card.command';
import { RemoveEntryCommand } from './app/commands/remove-entry.command';
import { UpdateEntryCommand } from './app/commands/update-entry.command';
import { ListCollectionQuery } from './app/queries/list-collection.query';
import { ExportCollectionQuery } from './app/queries/export-collection.query';
import { ImportCollectionCommand } from './app/commands/import-collection.command';
import { CollectionController } from './rest/collection.controller';
import { CollectionPrismaRepository } from './infra/collection.prisma.repository';
import { COLLECTION_REPOSITORY } from './domain/repositories/collection.repository';

@Module({
  controllers: [CollectionController],
  providers: [
    PrismaService,
    ScryfallClient,
    AddCardCommand,
    UpdateEntryCommand,
    RemoveEntryCommand,
    ListCollectionQuery,
    ExportCollectionQuery,
    ImportCollectionCommand,
    {
      provide: COLLECTION_REPOSITORY,
      useClass: CollectionPrismaRepository,
    },
  ],
  exports: [COLLECTION_REPOSITORY],
})
export class CollectionModule {}
