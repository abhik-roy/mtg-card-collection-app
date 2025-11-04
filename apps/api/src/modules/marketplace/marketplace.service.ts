import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/infra/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateListingDto } from './dto/create-listing.dto';

export type MarketplaceListQuery = {
  type?: 'BUY' | 'SELL';
  search?: string;
  setCode?: string;
  mine?: boolean;
  page: number;
  pageSize: number;
  userId: string;
};

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  async createListing(userId: string, input: CreateListingDto) {
    const record = await this.prisma.marketplaceListing.create({
      data: {
        userId,
        type: input.type,
        cardId: input.cardId,
        cardName: input.cardName,
        setCode: input.setCode,
        condition: input.condition,
        quantity: input.quantity ?? 1,
        price: input.price ?? null,
        currency: input.currency ?? 'USD',
        notes: input.notes ?? null,
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    return this.toPresenter(record);
  }

  async listListings(query: MarketplaceListQuery) {
    const where: Prisma.MarketplaceListingWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }
    if (query.search) {
      where.cardName = { contains: query.search, mode: 'insensitive' };
    }
    if (query.setCode) {
      where.setCode = { equals: query.setCode, mode: 'insensitive' };
    }
    if (query.mine) {
      where.userId = query.userId;
    }

    const [items, total] = await Promise.all([
      this.prisma.marketplaceListing.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.marketplaceListing.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toPresenter(item)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async removeListing(userId: string, id: string) {
    const result = await this.prisma.marketplaceListing.deleteMany({
      where: {
        id,
        userId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Listing not found');
    }

    return { ok: true };
  }

  private toPresenter(record: Prisma.MarketplaceListingGetPayload<{ include: { user: { select: { email: true } } } }>) {
    return {
      id: record.id,
      type: record.type,
      ownerId: record.userId,
      cardId: record.cardId ?? null,
      cardName: record.cardName,
      setCode: record.setCode ?? null,
      condition: record.condition ?? null,
      quantity: record.quantity,
      price: record.price ?? null,
      currency: record.currency,
      notes: record.notes ?? null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      seller: {
        email: record.user.email,
      },
    };
  }
}
