import { Inject, Injectable } from '@nestjs/common';
import {
  COLLECTION_REPOSITORY,
  CollectionListItem,
  CollectionRepository,
} from '../collection/domain/repositories/collection.repository';

export type PortfolioSummary = {
  totals: {
    currentValue: number;
    costBasis: number;
    unrealizedGain: number;
    gainPercentage: number | null;
  };
  distributionBySet: Array<{
    setCode: string;
    totalValue: number;
    percentage: number;
  }>;
  topHoldings: PortfolioHolding[];
  movers: {
    gainers: PortfolioMover[];
    losers: PortfolioMover[];
  };
  lastUpdated: string;
};

export type PortfolioHolding = {
  id: string;
  cardId: string;
  name: string;
  setCode: string;
  quantity: number;
  finish: string;
  imageSmall?: string;
  unitPrice: number;
  totalValue: number;
};

export type PortfolioMover = PortfolioHolding & {
  costBasis: number;
  gain: number;
  gainPerUnit: number;
  gainPercentage: number;
};

@Injectable()
export class PortfolioService {
  constructor(
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: CollectionRepository,
  ) {}

  async buildSummary(userId: string): Promise<PortfolioSummary> {
    const entries = await this.collectionRepository.findAll({
      userId,
    });

    const holdings = entries.map((entry) => this.toHolding(entry));
    const totals = holdings.reduce(
      (acc, holding, index) => {
        const acquiredPrice = entries[index].acquiredPrice ?? undefined;
        const costBasis = acquiredPrice !== undefined ? acquiredPrice * holding.quantity : 0;
        acc.currentValue += holding.totalValue;
        acc.costBasis += costBasis;
        return acc;
      },
      { currentValue: 0, costBasis: 0 },
    );

    const unrealizedGain = totals.currentValue - totals.costBasis;
    const gainPercentage =
      totals.costBasis > 0 ? Number(((unrealizedGain / totals.costBasis) * 100).toFixed(2)) : null;

    const distribution = this.computeDistribution(holdings, totals.currentValue);
    const topHoldings = holdings
      .slice()
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);

    const movers = this.computeMovers(entries, holdings);

    return {
      totals: {
        currentValue: roundCurrency(totals.currentValue),
        costBasis: roundCurrency(totals.costBasis),
        unrealizedGain: roundCurrency(unrealizedGain),
        gainPercentage,
      },
      distributionBySet: distribution,
      topHoldings,
      movers,
      lastUpdated: new Date().toISOString(),
    };
  }

  private toHolding(entry: CollectionListItem): PortfolioHolding {
    const unitPrice = resolveMarketPrice(entry);
    const totalValue = unitPrice * entry.quantity;
    return {
      id: entry.id,
      cardId: entry.cardId,
      name: entry.name,
      setCode: entry.setCode,
      quantity: entry.quantity,
      finish: entry.finish,
      imageSmall: entry.imageSmall,
      unitPrice: roundCurrency(unitPrice),
      totalValue: roundCurrency(totalValue),
    };
  }

  private computeDistribution(holdings: PortfolioHolding[], totalValue: number) {
    const bySet = new Map<string, number>();
    holdings.forEach((holding) => {
      const current = bySet.get(holding.setCode) ?? 0;
      bySet.set(holding.setCode, current + holding.totalValue);
    });

    return Array.from(bySet.entries())
      .map(([setCode, value]) => ({
        setCode,
        totalValue: roundCurrency(value),
        percentage: totalValue > 0 ? Number(((value / totalValue) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);
  }

  private computeMovers(entries: CollectionListItem[], holdings: PortfolioHolding[]) {
    const movers = entries
      .map((entry, index) => {
        const acquiredPrice = entry.acquiredPrice ?? undefined;
        if (acquiredPrice === undefined) {
          return null;
        }
        const holding = holdings[index];
        const costBasis = acquiredPrice * holding.quantity;
        const gain = holding.totalValue - costBasis;
        const gainPerUnit = holding.unitPrice - acquiredPrice;
        const gainPercentage =
          acquiredPrice > 0 ? Number((((holding.unitPrice - acquiredPrice) / acquiredPrice) * 100).toFixed(2)) : 0;

        return {
          ...holding,
          costBasis: roundCurrency(costBasis),
          gain: roundCurrency(gain),
          gainPerUnit: roundCurrency(gainPerUnit),
          gainPercentage,
        };
      })
      .filter((value): value is PortfolioMover => value !== null && Number.isFinite(value.gain));

    const gainers = movers
      .filter((mover) => mover.gain > 0)
      .sort((a, b) => b.gain - a.gain)
      .slice(0, 5);
    const losers = movers
      .filter((mover) => mover.gain < 0)
      .sort((a, b) => a.gain - b.gain)
      .slice(0, 5);

    return { gainers, losers };
  }
}

function resolveMarketPrice(entry: CollectionListItem): number {
  const finish = entry.finish?.toUpperCase() ?? 'NONFOIL';
  const isFoil = finish === 'FOIL' || finish === 'ETCHED';
  const price = isFoil ? entry.usdFoil ?? entry.usd : entry.usd ?? entry.usdFoil;
  return price ?? 0;
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}
