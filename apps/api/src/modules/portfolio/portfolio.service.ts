import { Inject, Injectable } from '@nestjs/common';
import { CardLiquiditySnapshot, PortfolioValueSnapshot, PriceSnapshot } from '@prisma/client';
import { PrismaService } from '../../shared/infra/prisma/prisma.service';
import {
  COLLECTION_REPOSITORY,
  CollectionListItem,
  CollectionRepository,
} from '../collection/domain/repositories/collection.repository';

const TREND_LOOKBACK_DAYS = 180;
const VOLATILITY_WINDOW_DAYS = 30;
const VOLATILITY_SPARKLINE_POINTS = 12;
const COLOR_BUCKETS = ['W', 'U', 'B', 'R', 'G', 'Multi', 'Colorless'] as const;
const FORMAT_PRIORITY = [
  'commander',
  'pioneer',
  'modern',
  'standard',
  'legacy',
  'vintage',
  'historic',
  'pauper',
  'alchemy',
];
const RARITY_ORDER = ['mythic', 'rare', 'uncommon', 'common', 'special'];
const FINISH_ORDER = ['NONFOIL', 'FOIL', 'ETCHED'];

type PortfolioTrendPoint = {
  date: string;
  value: number;
  costBasis?: number;
  cashFlow?: number;
  benchmark?: number;
};

type PortfolioTrend = {
  timeframe: '180d';
  series: PortfolioTrendPoint[];
};

type DistributionSlice = {
  key: string;
  label: string;
  totalValue: number;
  quantity: number;
  percentage: number;
  averagePrice: number;
};

type PortfolioDistributions = {
  set: DistributionSlice[];
  finish: DistributionSlice[];
  colorIdentity: DistributionSlice[];
  format: DistributionSlice[];
  rarity: DistributionSlice[];
};

type HeatmapCell = {
  x: string;
  y: string;
  totalValue: number;
  quantity: number;
  percentage: number;
};

type PortfolioHeatmaps = {
  formatByColor: {
    x: string[];
    y: string[];
    cells: HeatmapCell[];
    metric: 'value';
  };
  rarityByFinish: {
    x: string[];
    y: string[];
    cells: HeatmapCell[];
    metric: 'value';
  };
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
  rarity?: string;
  colorIdentity?: string[];
  primaryColorBucket: string;
  primaryFormat?: string | null;
};

export type PortfolioMover = PortfolioHolding & {
  costBasis: number;
  gain: number;
  gainPerUnit: number;
  gainPercentage: number;
};

type MoversByWindow = {
  daily: {
    gainers: PortfolioMover[];
    losers: PortfolioMover[];
  };
  weekly: {
    gainers: PortfolioMover[];
    losers: PortfolioMover[];
  };
  monthly: {
    gainers: PortfolioMover[];
    losers: PortfolioMover[];
  };
};

type PortfolioVolatilityItem = {
  cardId: string;
  name: string;
  setCode: string;
  finish: string;
  volatilityScore: number;
  classification: 'STABLE' | 'WATCH' | 'SPECULATIVE';
  listingsCount?: number;
  buylistCount?: number;
  buylistHigh?: number;
  demandScore?: number;
  sparkline: number[];
  priceNow: number;
  priceChangePercent: number | null;
};

type PortfolioVolatility = {
  summary: {
    stable: number;
    watch: number;
    speculative: number;
  };
  items: PortfolioVolatilityItem[];
};

type TrendIndicator = {
  direction: 'UP' | 'DOWN' | 'FLAT';
  percentage: number | null;
};

type WatchlistHighlight = {
  id: string;
  cardId: string;
  cardName: string;
  setCode: string;
  direction: string;
  priceType: string;
  thresholdPercent: number;
  progressPercent: number | null;
  currentPrice?: number;
  targetPrice?: number;
  lastNotifiedAt?: string | null;
};

type WatchlistSummary = {
  upcoming: WatchlistHighlight[];
  triggered: WatchlistHighlight[];
};

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
  trend: PortfolioTrend;
  distributions: PortfolioDistributions;
  heatmaps: PortfolioHeatmaps;
  moversByWindow: MoversByWindow;
  volatility: PortfolioVolatility;
  watchlist: WatchlistSummary;
  trendIndicators: Record<string, TrendIndicator>;
  lastUpdated: string;
};

type AnalyticsData = {
  priceSnapshots: Map<string, PriceSnapshot[]>;
  liquiditySnapshots: Map<string, CardLiquiditySnapshot>;
  portfolioSnapshots: Map<string, PortfolioValueSnapshot>;
};

@Injectable()
export class PortfolioService {
  constructor(
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: CollectionRepository,
    private readonly prisma: PrismaService,
  ) {}

  async buildSummary(userId: string): Promise<PortfolioSummary> {
    const entries = await this.collectionRepository.findAll({
      userId,
    });

    if (entries.length === 0) {
      return {
        totals: {
          currentValue: 0,
          costBasis: 0,
          unrealizedGain: 0,
          gainPercentage: null,
        },
        distributionBySet: [],
        topHoldings: [],
        movers: {
          gainers: [],
          losers: [],
        },
        trend: {
          timeframe: '180d',
          series: [],
        },
        distributions: {
          set: [],
          finish: [],
          colorIdentity: [],
          format: [],
          rarity: [],
        },
        heatmaps: createEmptyHeatmaps(),
        moversByWindow: {
          daily: { gainers: [], losers: [] },
          weekly: { gainers: [], losers: [] },
          monthly: { gainers: [], losers: [] },
        },
        volatility: {
          summary: { stable: 0, watch: 0, speculative: 0 },
          items: [],
        },
        watchlist: { upcoming: [], triggered: [] },
        trendIndicators: {},
        lastUpdated: new Date().toISOString(),
      };
    }

    const holdings = entries.map((entry) => this.toHolding(entry));
    const totals = this.computeTotals(entries, holdings);

    const analyticsData = await this.fetchAnalyticsData(
      userId,
      entries.map((entry) => entry.cardId),
    );

    const trend = this.buildTrend(holdings, entries, totals, analyticsData);
    const distributions = this.buildDistributions(entries, holdings, totals.currentValue);
    const heatmaps = this.buildHeatmaps(entries, holdings, totals.currentValue);
    const moverResult = this.computeMoversByWindow(entries, holdings, analyticsData.priceSnapshots);
    const volatility = this.computeVolatility(
      entries,
      holdings,
      analyticsData.priceSnapshots,
      analyticsData.liquiditySnapshots,
    );
    const watchlist = await this.buildWatchlist(userId, entries, analyticsData.priceSnapshots);
    const topHoldings = this.selectTopHoldings(holdings);
    const moversByWindow = moverResult.windowData;
    const trendIndicators = moverResult.indicators;
    const movers = moversByWindow.daily;

    return {
      totals,
      distributionBySet: distributions.set.map((slice) => ({
        setCode: slice.key,
        totalValue: slice.totalValue,
        percentage: slice.percentage,
      })),
      topHoldings,
      movers,
      trend,
      distributions,
      heatmaps,
      moversByWindow,
      volatility,
      watchlist,
      trendIndicators,
      lastUpdated: new Date().toISOString(),
    };
  }

  private computeTotals(entries: CollectionListItem[], holdings: PortfolioHolding[]) {
    const aggregate = holdings.reduce(
      (acc, holding, index) => {
        acc.currentValue += holding.totalValue;
        const acquiredPrice = entries[index].acquiredPrice ?? undefined;
        if (acquiredPrice !== undefined) {
          acc.costBasis += acquiredPrice * holding.quantity;
        }
        return acc;
      },
      { currentValue: 0, costBasis: 0 },
    );

    const unrealizedGain = aggregate.currentValue - aggregate.costBasis;
    const gainPercentage =
      aggregate.costBasis > 0 ? Number(((unrealizedGain / aggregate.costBasis) * 100).toFixed(2)) : null;

    return {
      currentValue: roundCurrency(aggregate.currentValue),
      costBasis: roundCurrency(aggregate.costBasis),
      unrealizedGain: roundCurrency(unrealizedGain),
      gainPercentage,
    };
  }

  private async fetchAnalyticsData(userId: string, cardIds: string[]): Promise<AnalyticsData> {
    if (cardIds.length === 0) {
      return {
        priceSnapshots: new Map(),
        liquiditySnapshots: new Map(),
        portfolioSnapshots: new Map(),
      };
    }

    const since = new Date();
    since.setDate(since.getDate() - TREND_LOOKBACK_DAYS);

    const [priceRows, liquidityRows, portfolioRows] = await Promise.all([
      this.prisma.priceSnapshot.findMany({
        where: {
          cardId: { in: cardIds },
          asOfDate: { gte: since },
        },
        orderBy: [
          { cardId: 'asc' },
          { asOfDate: 'asc' },
        ],
      }),
      this.prisma.cardLiquiditySnapshot.findMany({
        where: {
          cardId: { in: cardIds },
          asOfDate: { gte: since },
        },
        orderBy: [
          { cardId: 'asc' },
          { asOfDate: 'desc' },
        ],
      }),
      this.prisma.portfolioValueSnapshot.findMany({
        where: {
          userId,
          asOfDate: { gte: since },
        },
        orderBy: { asOfDate: 'asc' },
      }),
    ]);

    const priceSnapshots = new Map<string, PriceSnapshot[]>();
    priceRows.forEach((row) => {
      const existing = priceSnapshots.get(row.cardId) ?? [];
      existing.push(row);
      priceSnapshots.set(row.cardId, existing);
    });

    const liquiditySnapshots = new Map<string, CardLiquiditySnapshot>();
    liquidityRows.forEach((row) => {
      if (!liquiditySnapshots.has(row.cardId)) {
        liquiditySnapshots.set(row.cardId, row);
      }
    });

    const portfolioSnapshots = new Map<string, PortfolioValueSnapshot>();
    portfolioRows.forEach((row) => {
      const key = row.asOfDate.toISOString().slice(0, 10);
      portfolioSnapshots.set(key, row);
    });

    return {
      priceSnapshots,
      liquiditySnapshots,
      portfolioSnapshots,
    };
  }

  private buildTrend(
    holdings: PortfolioHolding[],
    entries: CollectionListItem[],
    totals: { currentValue: number; costBasis: number },
    analytics: AnalyticsData,
  ): PortfolioTrend {
    const dates = new Set<string>();
    analytics.priceSnapshots.forEach((snapshots) => {
      snapshots.forEach((snapshot) => {
        dates.add(snapshot.asOfDate.toISOString().slice(0, 10));
      });
    });

    const todayKey = new Date().toISOString().slice(0, 10);
    dates.add(todayKey);

    const sortedDates = Array.from(dates.values()).sort();

    const series: PortfolioTrendPoint[] = sortedDates.map((dateKey) => {
      const date = new Date(`${dateKey}T00:00:00.000Z`);
      let totalValue = 0;

      holdings.forEach((holding, index) => {
        const snapshots = analytics.priceSnapshots.get(holding.cardId) ?? [];
        const snapshot = findSnapshotAtOrBefore(snapshots, date);
        const price =
          snapshot !== undefined
            ? resolveSnapshotPriceForFinish(snapshot, holding.finish) ?? holding.unitPrice
            : holding.unitPrice;
        totalValue += price * holding.quantity;
      });

      const portfolioSnapshot = analytics.portfolioSnapshots.get(dateKey);
      const costBasis =
        portfolioSnapshot?.costBasis !== undefined ? portfolioSnapshot.costBasis : totals.costBasis;
      const cashFlow =
        portfolioSnapshot !== undefined
          ? (portfolioSnapshot.cashIn ?? 0) - (portfolioSnapshot.cashOut ?? 0)
          : 0;
      const benchmark = portfolioSnapshot?.benchmarkValue ?? undefined;

      return {
        date: new Date(`${dateKey}T00:00:00.000Z`).toISOString(),
        value: roundCurrency(totalValue),
        costBasis: roundCurrency(costBasis),
        cashFlow: roundCurrency(cashFlow),
        benchmark: benchmark !== undefined ? roundCurrency(benchmark) : undefined,
      };
    });

    return {
      timeframe: '180d',
      series,
    };
  }

  private buildDistributions(
    entries: CollectionListItem[],
    holdings: PortfolioHolding[],
    totalValue: number,
  ): PortfolioDistributions {
    const aggregate = (
      resolver: (holding: PortfolioHolding, entry: CollectionListItem) => Array<{ key: string; label: string }>,
    ) => aggregateDistribution(holdings, entries, resolver, totalValue);

    const setSlices = aggregate((holding) => [
      { key: holding.setCode.toUpperCase(), label: holding.setCode.toUpperCase() },
    ]);
    const finishSlices = aggregate((holding) => [
      { key: holding.finish, label: holding.finish },
    ]);
    const colorSlices = aggregate((holding) => [
      { key: holding.primaryColorBucket, label: holding.primaryColorBucket },
    ]);
    const formatSlices = aggregate((holding) => [
      { key: formatDisplay(holding.primaryFormat), label: formatDisplay(holding.primaryFormat) },
    ]);
    const raritySlices = aggregate((holding, entry) => [
      {
        key: formatRarity(entry.rarity),
        label: formatRarity(entry.rarity),
      },
    ]);

    return {
      set: setSlices,
      finish: finishSlices,
      colorIdentity: colorSlices,
      format: formatSlices,
      rarity: raritySlices,
    };
  }

  private buildHeatmaps(
    entries: CollectionListItem[],
    holdings: PortfolioHolding[],
    totalPortfolioValue: number,
  ): PortfolioHeatmaps {
    const formatAxis = FORMAT_PRIORITY.map(formatDisplay).concat('Other');
    const colorAxis = [...COLOR_BUCKETS];
    const rarityAxis = RARITY_ORDER.map(capitalize).concat('Other');

    const formatCells = new Map<string, { totalValue: number; quantity: number }>();
    const rarityCells = new Map<string, { totalValue: number; quantity: number }>();

    holdings.forEach((holding, index) => {
      const entry = entries[index];
      const format = formatDisplay(holding.primaryFormat);
      const color = holding.primaryColorBucket;
      const rarity = formatRarity(entry.rarity);
      const finish = FINISH_ORDER.includes(holding.finish) ? holding.finish : 'NONFOIL';

      const formatKey = `${format}|${color}`;
      const formatCell = formatCells.get(formatKey) ?? { totalValue: 0, quantity: 0 };
      formatCell.totalValue += holding.totalValue;
      formatCell.quantity += holding.quantity;
      formatCells.set(formatKey, formatCell);

      const rarityKey = `${rarity}|${finish}`;
      const rarityCell = rarityCells.get(rarityKey) ?? { totalValue: 0, quantity: 0 };
      rarityCell.totalValue += holding.totalValue;
      rarityCell.quantity += holding.quantity;
      rarityCells.set(rarityKey, rarityCell);
    });

    const formatByColorCells: HeatmapCell[] = [];
    formatCells.forEach((value, key) => {
      const [format, color] = key.split('|');
      formatByColorCells.push({
        x: format,
        y: color,
        totalValue: roundCurrency(value.totalValue),
        quantity: Number(value.quantity.toFixed(2)),
        percentage:
          totalPortfolioValue > 0
            ? Number(((value.totalValue / totalPortfolioValue) * 100).toFixed(2))
            : 0,
      });
    });

    const rarityByFinishCells: HeatmapCell[] = [];
    rarityCells.forEach((value, key) => {
      const [rarity, finish] = key.split('|');
      rarityByFinishCells.push({
        x: rarity,
        y: finish,
        totalValue: roundCurrency(value.totalValue),
        quantity: Number(value.quantity.toFixed(2)),
        percentage:
          totalPortfolioValue > 0
            ? Number(((value.totalValue / totalPortfolioValue) * 100).toFixed(2))
            : 0,
      });
    });

    return {
      formatByColor: {
        x: formatAxis,
        y: colorAxis as string[],
        cells: formatByColorCells,
        metric: 'value',
      },
      rarityByFinish: {
        x: rarityAxis,
        y: FINISH_ORDER,
        cells: rarityByFinishCells,
        metric: 'value',
      },
    };
  }

  private computeMoversByWindow(
    entries: CollectionListItem[],
    holdings: PortfolioHolding[],
    priceSnapshots: Map<string, PriceSnapshot[]>,
  ): { windowData: MoversByWindow; indicators: Record<string, TrendIndicator> } {
    const daily = this.computeMoversForWindow(entries, holdings, priceSnapshots, 1);
    const weekly = this.computeMoversForWindow(entries, holdings, priceSnapshots, 7);
    const monthly = this.computeMoversForWindow(entries, holdings, priceSnapshots, 30);

    const windowData: MoversByWindow = {
      daily: {
        gainers: daily.movers
          .filter((mover) => mover.gain > 0)
          .sort((a, b) => b.gain - a.gain)
          .slice(0, 5),
        losers: daily.movers
          .filter((mover) => mover.gain < 0)
          .sort((a, b) => a.gain - b.gain)
          .slice(0, 5),
      },
      weekly: {
        gainers: weekly.movers
          .filter((mover) => mover.gain > 0)
          .sort((a, b) => b.gain - a.gain)
          .slice(0, 5),
        losers: weekly.movers
          .filter((mover) => mover.gain < 0)
          .sort((a, b) => a.gain - b.gain)
          .slice(0, 5),
      },
      monthly: {
        gainers: monthly.movers
          .filter((mover) => mover.gain > 0)
          .sort((a, b) => b.gain - a.gain)
          .slice(0, 5),
        losers: monthly.movers
          .filter((mover) => mover.gain < 0)
          .sort((a, b) => a.gain - b.gain)
          .slice(0, 5),
      },
    };

    const indicators: Record<string, TrendIndicator> = {};
    daily.indicators.forEach((value, cardId) => {
      indicators[cardId] = {
        direction: resolveTrendDirection(value.gainPercentage),
        percentage:
          value.gainPercentage !== null ? Number(value.gainPercentage.toFixed(2)) : null,
      };
    });

    return { windowData, indicators };
  }

  private computeMoversForWindow(
    entries: CollectionListItem[],
    holdings: PortfolioHolding[],
    priceSnapshots: Map<string, PriceSnapshot[]>,
    days: number,
  ): { movers: PortfolioMover[]; indicators: Map<string, { gainPercentage: number | null }> } {
    const lookbackMs = days * 24 * 60 * 60 * 1000;
    const movers: PortfolioMover[] = [];
    const indicators = new Map<string, { gainPercentage: number | null }>();

    holdings.forEach((holding, index) => {
      const snapshots = priceSnapshots.get(holding.cardId);
      if (!snapshots || snapshots.length === 0) {
        return;
      }

      const latest = snapshots[snapshots.length - 1];
      const priceNow =
        resolveSnapshotPriceForFinish(latest, holding.finish) ?? holding.unitPrice;
      const pastSnapshot = findSnapshotAtOrBefore(
        snapshots,
        new Date(latest.asOfDate.getTime() - lookbackMs),
      );
      const priceThen = pastSnapshot
        ? resolveSnapshotPriceForFinish(pastSnapshot, holding.finish)
        : priceNow;

      if (priceThen === undefined || priceThen === null) {
        return;
      }

      const gainPerUnit = priceNow - priceThen;
      const gain = gainPerUnit * holding.quantity;
      const gainPercentage = priceThen > 0 ? (gainPerUnit / priceThen) * 100 : null;
      const acquiredPrice = entries[index].acquiredPrice ?? undefined;
      const costBasis =
        acquiredPrice !== undefined ? roundCurrency(acquiredPrice * holding.quantity) : 0;

      movers.push({
        ...holding,
        costBasis,
        gain: roundCurrency(gain),
        gainPerUnit: roundCurrency(gainPerUnit),
        gainPercentage: gainPercentage !== null ? Number(gainPercentage.toFixed(2)) : 0,
      });
      indicators.set(holding.cardId, { gainPercentage });
    });

    return { movers, indicators };
  }

  private computeVolatility(
    entries: CollectionListItem[],
    holdings: PortfolioHolding[],
    priceSnapshots: Map<string, PriceSnapshot[]>,
    liquiditySnapshots: Map<string, CardLiquiditySnapshot>,
  ): PortfolioVolatility {
    const items: PortfolioVolatilityItem[] = [];
    let stable = 0;
    let watch = 0;
    let speculative = 0;

    holdings.forEach((holding) => {
      const snapshots = priceSnapshots.get(holding.cardId) ?? [];
      const recentSnapshots = snapshots.filter((snapshot) =>
        isWithinDays(snapshot.asOfDate, VOLATILITY_WINDOW_DAYS),
      );
      const priceSeries =
        recentSnapshots.length > 0
          ? recentSnapshots
              .map((snapshot) => resolveSnapshotPriceForFinish(snapshot, holding.finish))
              .filter((price): price is number => price !== undefined && price !== null)
          : [holding.unitPrice];

      if (priceSeries.length < 2) {
        return;
      }

      const meanPrice = mean(priceSeries);
      if (meanPrice <= 0) {
        return;
      }

      const stdDev = standardDeviation(priceSeries);
      const volatilityScore = stdDev / meanPrice;

      let classification: 'STABLE' | 'WATCH' | 'SPECULATIVE';
      if (volatilityScore < 0.05) {
        classification = 'STABLE';
        stable += 1;
      } else if (volatilityScore < 0.15) {
        classification = 'WATCH';
        watch += 1;
      } else {
        classification = 'SPECULATIVE';
        speculative += 1;
      }

      const latestSnapshot = snapshots[snapshots.length - 1];
      const liquidity = liquiditySnapshots.get(holding.cardId);
      const priceNow = priceSeries[priceSeries.length - 1];
      const priceStart = priceSeries[0];
      const priceChangePercent =
        priceStart > 0 ? Number((((priceNow - priceStart) / priceStart) * 100).toFixed(2)) : null;

      items.push({
        cardId: holding.cardId,
        name: holding.name,
        setCode: holding.setCode,
        finish: holding.finish,
        volatilityScore: Number(volatilityScore.toFixed(4)),
        classification,
        listingsCount: liquidity?.listingsCount ?? undefined,
        buylistCount: liquidity?.buylistCount ?? undefined,
        buylistHigh:
          liquidity?.buylistHigh !== undefined && liquidity?.buylistHigh !== null
            ? roundCurrency(liquidity.buylistHigh)
            : undefined,
        demandScore:
          latestSnapshot?.demandScore !== undefined && latestSnapshot?.demandScore !== null
            ? Number(latestSnapshot.demandScore.toFixed(3))
            : undefined,
        sparkline: downsampleSeries(priceSeries, VOLATILITY_SPARKLINE_POINTS).map((value) =>
          Number(value.toFixed(4)),
        ),
        priceNow: roundCurrency(priceNow),
        priceChangePercent,
      });
    });

    items.sort((a, b) => b.volatilityScore - a.volatilityScore);

    return {
      summary: { stable, watch, speculative },
      items: items.slice(0, 15),
    };
  }

  private async buildWatchlist(
    userId: string,
    entries: CollectionListItem[],
    priceSnapshots: Map<string, PriceSnapshot[]>,
  ): Promise<WatchlistSummary> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user?.email) {
      return { upcoming: [], triggered: [] };
    }

    const watches = await this.prisma.priceWatch.findMany({
      where: { contact: user.email },
      orderBy: { updatedAt: 'desc' },
    });

    if (watches.length === 0) {
      return { upcoming: [], triggered: [] };
    }

    const holdingsByCard = new Map(entries.map((entry) => [entry.cardId, entry]));

    const upcoming: WatchlistHighlight[] = [];
    const triggered: WatchlistHighlight[] = [];

    watches.forEach((watch) => {
      const entry = holdingsByCard.get(watch.cardId);
      if (!entry) {
        return;
      }
      const snapshots = priceSnapshots.get(watch.cardId) ?? [];
      const latest = snapshots[snapshots.length - 1];
      const currentPrice =
        latest !== undefined
          ? resolveSnapshotPriceByType(latest, watch.priceType)
          : resolveMarketPrice(entry);

      const baseline = watch.lastPrice ?? currentPrice ?? 0;
      let progressPercent: number | null = null;
      let targetPrice: number | undefined = undefined;

      if (baseline > 0 && currentPrice !== undefined && currentPrice !== null) {
        const deltaPercent = ((currentPrice - baseline) / baseline) * 100;
        const normalized =
          watch.direction === 'UP' ? deltaPercent : deltaPercent * -1;
        progressPercent = clamp(
          Number(((normalized / watch.thresholdPercent) * 100).toFixed(2)),
          0,
          200,
        );
        targetPrice =
          watch.direction === 'UP'
            ? baseline * (1 + watch.thresholdPercent / 100)
            : baseline * (1 - watch.thresholdPercent / 100);
      }

      const highlight: WatchlistHighlight = {
        id: watch.id,
        cardId: watch.cardId,
        cardName: entry.name,
        setCode: entry.setCode,
        direction: watch.direction,
        priceType: watch.priceType,
        thresholdPercent: watch.thresholdPercent,
        progressPercent,
        currentPrice:
          currentPrice !== undefined && currentPrice !== null
            ? roundCurrency(currentPrice)
            : undefined,
        targetPrice: targetPrice !== undefined ? roundCurrency(targetPrice) : undefined,
        lastNotifiedAt: watch.lastNotifiedAt ? watch.lastNotifiedAt.toISOString() : null,
      };

      if ((progressPercent !== null && progressPercent >= 100) || watch.lastNotifiedAt) {
        triggered.push(highlight);
      } else {
        upcoming.push(highlight);
      }
    });

    upcoming.sort((a, b) => (b.progressPercent ?? 0) - (a.progressPercent ?? 0));
    triggered.sort((a, b) => {
      if (a.lastNotifiedAt && b.lastNotifiedAt) {
        return b.lastNotifiedAt.localeCompare(a.lastNotifiedAt);
      }
      if (a.lastNotifiedAt) {
        return -1;
      }
      if (b.lastNotifiedAt) {
        return 1;
      }
      return 0;
    });

    return {
      upcoming: upcoming.slice(0, 10),
      triggered: triggered.slice(0, 10),
    };
  }

  private selectTopHoldings(holdings: PortfolioHolding[]): PortfolioHolding[] {
    return holdings
      .slice()
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);
  }

  private toHolding(entry: CollectionListItem): PortfolioHolding {
    const unitPrice = resolveMarketPrice(entry);
    const totalValue = unitPrice * entry.quantity;
    const primaryFormat = pickPrimaryFormat(entry.formats);

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
      rarity: entry.rarity,
      colorIdentity: entry.colorIdentity,
      primaryColorBucket: resolveColorBucket(entry.colorIdentity),
      primaryFormat,
    };
  }
}

export function aggregateDistribution(
  holdings: PortfolioHolding[],
  entries: CollectionListItem[],
  resolver: (holding: PortfolioHolding, entry: CollectionListItem) => Array<{ key: string; label: string }>,
  totalValue: number,
): DistributionSlice[] {
  const map = new Map<string, { label: string; totalValue: number; quantity: number }>();

  holdings.forEach((holding, index) => {
    const entry = entries[index];
    const descriptors = resolver(holding, entry).filter((descriptor) => !!descriptor.key);
    if (descriptors.length === 0) {
      return;
    }
    const weight = 1 / descriptors.length;

    descriptors.forEach((descriptor) => {
      const bucket = map.get(descriptor.key) ?? {
        label: descriptor.label,
        totalValue: 0,
        quantity: 0,
      };
      bucket.totalValue += holding.totalValue * weight;
      bucket.quantity += holding.quantity * weight;
      map.set(descriptor.key, bucket);
    });
  });

  const slices: DistributionSlice[] = Array.from(map.entries()).map(([key, value]) => ({
    key,
    label: value.label,
    totalValue: roundCurrency(value.totalValue),
    quantity: Number(value.quantity.toFixed(2)),
    percentage:
      totalValue > 0 ? Number(((value.totalValue / totalValue) * 100).toFixed(2)) : 0,
    averagePrice:
      value.quantity > 0 ? roundCurrency(value.totalValue / value.quantity) : 0,
  }));

  slices.sort((a, b) => b.totalValue - a.totalValue);
  return slices.slice(0, 12);
}

function resolveMarketPrice(entry: CollectionListItem): number {
  const finish = entry.finish?.toUpperCase() ?? 'NONFOIL';
  const isFoil = finish === 'FOIL' || finish === 'ETCHED';
  const price = isFoil ? entry.usdFoil ?? entry.usd : entry.usd ?? entry.usdFoil;
  return price ?? 0;
}

function resolveSnapshotPriceForFinish(snapshot: PriceSnapshot, finish: string): number | undefined {
  const isFoil = ['FOIL', 'ETCHED'].includes(finish.toUpperCase());
  const value = isFoil ? snapshot.usdFoil ?? snapshot.usd : snapshot.usd ?? snapshot.usdFoil;
  return value ?? undefined;
}

function resolveSnapshotPriceByType(snapshot: PriceSnapshot, priceType: string): number | undefined {
  if (priceType === 'USD_FOIL') {
    return snapshot.usdFoil ?? snapshot.usd ?? undefined;
  }
  return snapshot.usd ?? snapshot.usdFoil ?? undefined;
}

function resolveColorBucket(identity: string[] | undefined): string {
  if (!identity || identity.length === 0) {
    return 'Colorless';
  }
  if (identity.length === 1) {
    return identity[0].toUpperCase();
  }
  return 'Multi';
}

export function resolveTrendDirection(percentage: number | null): 'UP' | 'DOWN' | 'FLAT' {
  if (percentage === null) {
    return 'FLAT';
  }
  if (percentage > 0.25) {
    return 'UP';
  }
  if (percentage < -0.25) {
    return 'DOWN';
  }
  return 'FLAT';
}

function pickPrimaryFormat(formats: Record<string, string> | undefined): string | null {
  if (!formats) {
    return null;
  }

  for (const format of FORMAT_PRIORITY) {
    const legality = formats[format];
    if (legality === 'legal' || legality === 'restricted') {
      return format;
    }
  }

  const firstLegal = Object.entries(formats).find(
    ([, legality]) => legality === 'legal' || legality === 'restricted',
  );
  return firstLegal ? firstLegal[0] : null;
}

function formatDisplay(format: string | null | undefined): string {
  if (!format) {
    return 'Other';
  }
  return capitalize(format);
}

function formatRarity(rarity: string | undefined): string {
  if (!rarity) {
    return 'Other';
  }
  const normalized = rarity.toLowerCase();
  if (RARITY_ORDER.includes(normalized)) {
    return capitalize(normalized);
  }
  return 'Other';
}

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

function standardDeviation(values: number[]): number {
  const avg = mean(values);
  const variance =
    values.reduce((acc, value) => acc + (value - avg) ** 2, 0) / Math.max(values.length - 1, 1);
  return Math.sqrt(variance);
}

function downsampleSeries(values: number[], maxPoints: number): number[] {
  if (values.length <= maxPoints) {
    return values.slice();
  }
  const step = values.length / maxPoints;
  const sampled: number[] = [];
  for (let i = 0; i < maxPoints; i += 1) {
    sampled.push(values[Math.floor(i * step)]);
  }
  return sampled;
}

function findSnapshotAtOrBefore(snapshots: PriceSnapshot[], date: Date): PriceSnapshot | undefined {
  let candidate: PriceSnapshot | undefined;
  for (const snapshot of snapshots) {
    if (snapshot.asOfDate <= date) {
      candidate = snapshot;
    } else {
      break;
    }
  }
  return candidate ?? snapshots[snapshots.length - 1];
}

function isWithinDays(date: Date, days: number): boolean {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);
  return date >= threshold;
}

function capitalize(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function createEmptyHeatmaps(): PortfolioHeatmaps {
  return {
    formatByColor: {
      x: FORMAT_PRIORITY.map(formatDisplay).concat('Other'),
      y: COLOR_BUCKETS as unknown as string[],
      cells: [],
      metric: 'value',
    },
    rarityByFinish: {
      x: RARITY_ORDER.map(capitalize).concat('Other'),
      y: FINISH_ORDER,
      cells: [],
      metric: 'value',
    },
  };
}
