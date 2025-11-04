import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ScryfallClient } from '../../../shared/infra/http/scryfall.client';
import { PrismaService } from '../../../shared/infra/prisma/prisma.service';
import { CatalogMapper } from '../../catalog/infra/catalog.mapper';
import { CollectionEntry } from '../domain/entities/collection-entry';
import {
  CollectionListItem,
  CollectionListQuery,
  CollectionListResult,
  CollectionRepository,
} from '../domain/repositories/collection.repository';
import { CollectionMapper, PrismaCollectionWithCache } from './collection.mapper';

type CachedCardSnapshot = {
  lang: string;
  name: string;
  setCode: string;
  collectorNumber: string;
  imageSmall?: string;
  usd?: number;
  usdFoil?: number;
};

@Injectable()
export class CollectionPrismaRepository implements CollectionRepository {
  private readonly logger = new Logger(CollectionPrismaRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scryfallClient: ScryfallClient,
  ) {}

  async create(entry: CollectionEntry): Promise<void> {
    await this.ensureCatalogCache(entry.cardId);

    await this.prisma.collectionEntry.create({
      data: CollectionMapper.toPrisma(entry),
    });
  }

  async save(entry: CollectionEntry): Promise<void> {
    await this.prisma.collectionEntry.update({
      where: { id: entry.id.toString() },
      data: CollectionMapper.toPrisma(entry),
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.prisma.collectionEntry.deleteMany({
      where: { id, userId },
    });
  }

  async findById(id: string, userId: string): Promise<CollectionEntry | null> {
    const record = await this.prisma.collectionEntry.findFirst({
      where: { id, userId },
    });

    if (!record) {
      return null;
    }

    return CollectionMapper.toDomain(record);
  }

  async list(query: CollectionListQuery): Promise<CollectionListResult> {
    const where = this.buildWhere({ q: query.q, setCode: query.setCode, userId: query.userId });

    const [items, total] = await Promise.all([
      this.prisma.collectionEntry.findMany({
        where,
        include: {
          catalogCache: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.collectionEntry.count({ where }),
    ]);

    const missingCardIds = items
      .filter((item) => !item.catalogCache)
      .map((item) => item.cardId);

    const fetchedCache = await this.fetchAndCacheMissingCards(missingCardIds);

    return {
      items: items.map((item) => this.toListItem(item, fetchedCache.get(item.cardId))),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async findAll(query: Omit<CollectionListQuery, 'page' | 'pageSize'>): Promise<CollectionListItem[]> {
    const where = this.buildWhere({ q: query.q, setCode: query.setCode, userId: query.userId });

    const items = await this.prisma.collectionEntry.findMany({
      where,
      include: {
        catalogCache: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const missingCardIds = items
      .filter((item) => !item.catalogCache)
      .map((item) => item.cardId);

    const fetchedCache = await this.fetchAndCacheMissingCards(missingCardIds);

    return items.map((item) => this.toListItem(item, fetchedCache.get(item.cardId)));
  }

  private buildWhere(filters: { userId: string; q?: string; setCode?: string }): Prisma.CollectionEntryWhereInput {
    const catalogWhere: Prisma.CatalogCacheWhereInput = {};

    if (filters.q) {
      catalogWhere.name = {
        contains: filters.q,
      };
    }

    if (filters.setCode) {
      catalogWhere.setCode = {
        equals: filters.setCode,
      };
    }

    const where: Prisma.CollectionEntryWhereInput = {
      userId: filters.userId,
    };
    if (Object.keys(catalogWhere).length > 0) {
      where.catalogCache = { is: catalogWhere };
    }

    return where;
  }

  private async fetchAndCacheMissingCards(cardIds: string[]): Promise<Map<string, CachedCardSnapshot>> {
    const output = new Map<string, CachedCardSnapshot>();

    const limitedIds = cardIds.slice(0, 50);
    for (const id of limitedIds) {
      try {
        const card = await this.scryfallClient.getById(id);
        const domainCard = CatalogMapper.toDomain(card);

        await this.prisma.catalogCache.upsert({
          where: { cardId: id },
          create: {
            cardId: id,
            name: domainCard.name,
            setCode: domainCard.setCode,
            collectorNumber: domainCard.collectorNumber,
            lang: domainCard.lang,
            rarity: domainCard.rarity,
            imageSmall: domainCard.imageSmall,
            imageNormal: domainCard.imageNormal,
            usd: domainCard.usd,
            usdFoil: domainCard.usdFoil,
          },
          update: {
            name: domainCard.name,
            setCode: domainCard.setCode,
            collectorNumber: domainCard.collectorNumber,
            lang: domainCard.lang,
            rarity: domainCard.rarity,
            imageSmall: domainCard.imageSmall,
            imageNormal: domainCard.imageNormal,
            usd: domainCard.usd,
            usdFoil: domainCard.usdFoil,
            cachedAt: new Date(),
          },
        });

        output.set(id, {
          lang: domainCard.lang,
          name: domainCard.name,
          setCode: domainCard.setCode,
          collectorNumber: domainCard.collectorNumber,
          imageSmall: domainCard.imageSmall,
          usd: domainCard.usd,
          usdFoil: domainCard.usdFoil,
        });
      } catch (error) {
        this.logger.warn(`Failed to hydrate catalog cache for ${id}: ${(error as Error).message}`);
      }
    }

    return output;
  }

  private async ensureCatalogCache(cardId: string): Promise<void> {
    await this.fetchAndCacheMissingCards([cardId]);
  }

  private toListItem(
    record: PrismaCollectionWithCache,
    fallback: CachedCardSnapshot | undefined,
  ): CollectionListItem {
    const cache = record.catalogCache;

    return {
      id: record.id,
      cardId: record.cardId,
      quantity: record.quantity,
      finish: record.finish,
      condition: record.condition,
      language: record.language,
      location: record.location ?? undefined,
      acquiredPrice: record.acquiredPrice ?? undefined,
      name: cache?.name ?? fallback?.name ?? '',
      setCode: cache?.setCode ?? fallback?.setCode ?? '',
      collectorNumber: cache?.collectorNumber ?? fallback?.collectorNumber ?? '',
      imageSmall: cache?.imageSmall ?? fallback?.imageSmall,
      usd: cache?.usd ?? fallback?.usd,
      usdFoil: cache?.usdFoil ?? fallback?.usdFoil,
    };
  }
}
