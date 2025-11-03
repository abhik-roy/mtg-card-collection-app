import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infra/prisma/prisma.service';
import { UniqueEntityId } from '../../../shared/domain/core/unique-entity-id';
import { PriceWatch } from '../domain/entities/price-watch';
import {
  PriceWatchRepository,
} from '../domain/repositories/price-watch.repository';

@Injectable()
export class PriceWatchPrismaRepository implements PriceWatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(watch: PriceWatch): Promise<void> {
    await this.prisma.priceWatch.create({
      data: this.toPrisma(watch),
    });
  }

  async save(watch: PriceWatch): Promise<void> {
    await this.prisma.priceWatch.update({
      where: { id: watch.id.toString() },
      data: this.toPrisma(watch),
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.priceWatch.delete({ where: { id } });
  }

  async findAll(): Promise<PriceWatch[]> {
    const records = await this.prisma.priceWatch.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => this.toDomain(record));
  }

  async findById(id: string): Promise<PriceWatch | null> {
    const record = await this.prisma.priceWatch.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  private toPrisma(watch: PriceWatch) {
    return {
      id: watch.id.toString(),
      cardId: watch.cardId,
      direction: watch.direction,
      priceType: watch.priceType,
      thresholdPercent: watch.thresholdPercent,
      contact: watch.contact,
      lastPrice: watch.lastPrice ?? null,
      lastNotifiedAt: watch.lastNotifiedAt ?? null,
      createdAt: watch.createdAt,
      updatedAt: watch.updatedAt,
    };
  }

  private toDomain(record: any): PriceWatch {
    return PriceWatch.create({
      id: UniqueEntityId.create(record.id),
      cardId: record.cardId,
      direction: record.direction,
      priceType: record.priceType,
      thresholdPercent: record.thresholdPercent,
      contact: record.contact,
      lastPrice: record.lastPrice ?? undefined,
      lastNotifiedAt: record.lastNotifiedAt ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
