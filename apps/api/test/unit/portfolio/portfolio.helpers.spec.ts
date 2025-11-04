import { CardLiquiditySnapshot, PriceSnapshot } from '@prisma/client';
import {
  PortfolioHolding,
  PortfolioSummary,
  aggregateDistribution,
  resolveTrendDirection,
} from '../../../src/modules/portfolio/portfolio.service';
import { CollectionListItem } from '../../../src/modules/collection/domain/repositories/collection.repository';
import { PortfolioService } from '../../../src/modules/portfolio/portfolio.service';

function makeCollectionItem(overrides: Partial<CollectionListItem>): CollectionListItem {
  return {
    id: overrides.id ?? 'entry-1',
    cardId: overrides.cardId ?? 'card-1',
    name: overrides.name ?? 'Mystic Card',
    quantity: overrides.quantity ?? 1,
    finish: overrides.finish ?? 'NONFOIL',
    condition: overrides.condition ?? 'NM',
    language: overrides.language ?? 'en',
    location: overrides.location,
    imageSmall: overrides.imageSmall,
    usd: overrides.usd,
    usdFoil: overrides.usdFoil,
    setCode: overrides.setCode ?? 'set',
    collectorNumber: overrides.collectorNumber ?? '001',
    acquiredPrice: overrides.acquiredPrice ?? null,
    rarity: overrides.rarity,
    colorIdentity: overrides.colorIdentity,
    typeLine: overrides.typeLine,
    setType: overrides.setType,
    releasedAt: overrides.releasedAt,
    manaValue: overrides.manaValue,
    formats: overrides.formats,
  };
}

function makeHolding(overrides: Partial<PortfolioHolding>): PortfolioHolding {
  return {
    id: overrides.id ?? 'h-1',
    cardId: overrides.cardId ?? 'card-1',
    name: overrides.name ?? 'Mystic Card',
    setCode: overrides.setCode ?? 'set',
    quantity: overrides.quantity ?? 1,
    finish: overrides.finish ?? 'NONFOIL',
    imageSmall: overrides.imageSmall,
    unitPrice: overrides.unitPrice ?? 5,
    totalValue: overrides.totalValue ?? 5,
    rarity: overrides.rarity,
    colorIdentity: overrides.colorIdentity,
    primaryColorBucket: overrides.primaryColorBucket ?? 'U',
    primaryFormat: overrides.primaryFormat ?? 'modern',
  };
}

describe('portfolio helpers', () => {
  it('aggregates distribution slices with proportional weighting', () => {
    const holdings: PortfolioHolding[] = [
      makeHolding({ id: 'h-1', cardId: 'card-1', totalValue: 40, quantity: 2 }),
      makeHolding({ id: 'h-2', cardId: 'card-2', totalValue: 20, quantity: 4 }),
    ];

    const entries: CollectionListItem[] = [
      makeCollectionItem({ id: 'entry-1', cardId: 'card-1' }),
      makeCollectionItem({ id: 'entry-2', cardId: 'card-2' }),
    ];

    const slices = aggregateDistribution(
      holdings,
      entries,
      () => [
        { key: 'control', label: 'Control' },
        { key: 'tempo', label: 'Tempo' },
      ],
      60,
    );

    const control = slices.find((slice) => slice.key === 'control');
    const tempo = slices.find((slice) => slice.key === 'tempo');

    expect(control).toBeDefined();
    expect(control?.totalValue).toBeCloseTo(30);
    expect(control?.quantity).toBeCloseTo(3);
    expect(control?.percentage).toBeCloseTo(50);

    expect(tempo).toBeDefined();
    expect(tempo?.totalValue).toBeCloseTo(30);
    expect(tempo?.quantity).toBeCloseTo(3);
    expect(tempo?.percentage).toBeCloseTo(50);
  });

  it('maps trend directions using tolerance thresholds', () => {
    expect(resolveTrendDirection(null)).toBe('FLAT');
    expect(resolveTrendDirection(0)).toBe('FLAT');
    expect(resolveTrendDirection(0.2)).toBe('FLAT');
    expect(resolveTrendDirection(0.3)).toBe('UP');
    expect(resolveTrendDirection(-0.3)).toBe('DOWN');
  });

  it('classifies volatility tiers based on rolling standard deviation', () => {
    const service = new PortfolioService({} as any, {} as any);

    const entries: CollectionListItem[] = [
      makeCollectionItem({ id: 'entry-1', cardId: 'stable-card', finish: 'NONFOIL' }),
      makeCollectionItem({ id: 'entry-2', cardId: 'spec-card', finish: 'NONFOIL' }),
    ];

    const holdings: PortfolioHolding[] = [
      makeHolding({ id: 'h-1', cardId: 'stable-card', name: 'Stable Asset', totalValue: 20, unitPrice: 10 }),
      makeHolding({ id: 'h-2', cardId: 'spec-card', name: 'Speculative Asset', totalValue: 10, unitPrice: 5 }),
    ];

    const recentDate = new Date();
    const earlierDate = new Date(recentDate.getTime() - 5 * 24 * 60 * 60 * 1000);
    const olderDate = new Date(recentDate.getTime() - 10 * 24 * 60 * 60 * 1000);

    const priceSnapshots = new Map<string, PriceSnapshot[]>();
    priceSnapshots.set('stable-card', [
      { cardId: 'stable-card', asOfDate: olderDate, usd: 10, usdFoil: null, listingsCount: 10, buylistPrice: null, demandScore: 0.2, createdAt: olderDate },
      { cardId: 'stable-card', asOfDate: earlierDate, usd: 10.1, usdFoil: null, listingsCount: 10, buylistPrice: null, demandScore: 0.22, createdAt: earlierDate },
      { cardId: 'stable-card', asOfDate: recentDate, usd: 9.9, usdFoil: null, listingsCount: 10, buylistPrice: null, demandScore: 0.25, createdAt: recentDate },
    ]);
    priceSnapshots.set('spec-card', [
      { cardId: 'spec-card', asOfDate: olderDate, usd: 5, usdFoil: null, listingsCount: 6, buylistPrice: null, demandScore: 0.4, createdAt: olderDate },
      { cardId: 'spec-card', asOfDate: earlierDate, usd: 7.5, usdFoil: null, listingsCount: 6, buylistPrice: null, demandScore: 0.5, createdAt: earlierDate },
      { cardId: 'spec-card', asOfDate: recentDate, usd: 3.2, usdFoil: null, listingsCount: 6, buylistPrice: null, demandScore: 0.35, createdAt: recentDate },
    ]);

    const liquiditySnapshots = new Map<string, CardLiquiditySnapshot>();
    liquiditySnapshots.set('stable-card', {
      cardId: 'stable-card',
      asOfDate: recentDate,
      listingsCount: 28,
      buylistCount: 4,
      buylistHigh: 12,
      createdAt: recentDate,
    });

    liquiditySnapshots.set('spec-card', {
      cardId: 'spec-card',
      asOfDate: recentDate,
      listingsCount: 3,
      buylistCount: 1,
      buylistHigh: 4,
      createdAt: recentDate,
    });

    const volatility = (service as any).computeVolatility(entries, holdings, priceSnapshots, liquiditySnapshots);

    expect(volatility.summary.stable).toBe(1);
    expect(volatility.summary.speculative).toBe(1);
    expect(volatility.summary.watch).toBe(0);

    const stable = volatility.items.find((item: PortfolioSummary['volatility']['items'][number]) => item.cardId === 'stable-card');
    const speculative = volatility.items.find((item: PortfolioSummary['volatility']['items'][number]) => item.cardId === 'spec-card');

    expect(stable?.classification).toBe('STABLE');
    expect(speculative?.classification).toBe('SPECULATIVE');
    expect(speculative?.priceChangePercent).toBeLessThan(0);
  });
});
