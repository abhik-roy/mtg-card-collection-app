import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, DeckBoard } from '@prisma/client';
import { PrismaService } from '../../shared/infra/prisma/prisma.service';

type DeckCardInput = {
  cardId: string;
  quantity: number;
  board?: DeckBoard;
};

type DeckInput = {
  userId: string;
  name: string;
  format?: string;
  description?: string;
  cards: DeckCardInput[];
};

type DeckUpdateInput = {
  userId: string;
  deckId: string;
  name?: string;
  format?: string | null;
  description?: string | null;
  cards?: DeckCardInput[];
};

@Injectable()
export class DecksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: DeckInput) {
    return this.prisma.deck.create({
      data: {
        userId: input.userId,
        name: input.name,
        format: input.format,
        description: input.description,
        cards: {
          create: input.cards.map((card) => ({
            cardId: card.cardId,
            quantity: card.quantity,
            board: card.board ?? DeckBoard.MAIN,
          })),
        },
      },
      include: {
        cards: true,
      },
    });
  }

  list(userId: string) {
    return this.prisma.deck.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        cards: true,
      },
    });
  }

  async getById(userId: string, deckId: string) {
    const deck = await this.prisma.deck.findFirst({
      where: { id: deckId, userId },
      include: {
        cards: true,
      },
    });

    if (!deck) {
      throw new NotFoundException({
        error: {
          code: 'NOT_FOUND',
          message: `Deck ${deckId} not found`,
        },
      });
    }

    return deck;
  }

  async update(input: DeckUpdateInput) {
    await this.ensureOwnership(input.userId, input.deckId);

    const data: Prisma.DeckUpdateInput = {};

    if (input.name !== undefined) {
      data.name = input.name;
    }
    if (input.format !== undefined) {
      data.format = input.format;
    }
    if (input.description !== undefined) {
      data.description = input.description;
    }

    if (input.cards) {
      data.cards = {
        deleteMany: {},
        create: input.cards.map((card) => ({
          cardId: card.cardId,
          quantity: card.quantity,
          board: card.board ?? DeckBoard.MAIN,
        })),
      };
    }

    return this.prisma.deck.update({
      where: { id: input.deckId },
      data,
      include: {
        cards: true,
      },
    });
  }

  async delete(userId: string, deckId: string): Promise<void> {
    await this.ensureOwnership(userId, deckId);
    await this.prisma.deck.delete({
      where: { id: deckId },
    });
  }

  async compare(userId: string, deckId: string) {
    const deck = await this.getById(userId, deckId);

    const collectionEntries = await this.prisma.collectionEntry.groupBy({
      by: ['cardId'],
      where: {
        userId,
      },
      _sum: {
        quantity: true,
      },
    });

    const totals = new Map<string, number>();
    collectionEntries.forEach((entry) => {
      totals.set(entry.cardId, entry._sum.quantity ?? 0);
    });

    const summarize = (board: DeckBoard) => {
      const cards = deck.cards.filter((card) => card.board === board);

      return cards.map((card) => {
        const owned = totals.get(card.cardId) ?? 0;
        const missing = Math.max(card.quantity - owned, 0);

        return {
          cardId: card.cardId,
          required: card.quantity,
          owned,
          missing,
        };
      });
    };

    const main = summarize(DeckBoard.MAIN);
    const side = summarize(DeckBoard.SIDE);

    return {
      deck: {
        id: deck.id,
        name: deck.name,
        format: deck.format,
        description: deck.description,
        updatedAt: deck.updatedAt,
      },
      main,
      side,
    };
  }

  private async ensureOwnership(userId: string, deckId: string) {
    const deck = await this.prisma.deck.findFirst({ where: { id: deckId, userId } });
    if (!deck) {
      throw new NotFoundException({
        error: {
          code: 'NOT_FOUND',
          message: `Deck ${deckId} not found`,
        },
      });
    }
  }
}
