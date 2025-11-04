export type PortfolioTrendPoint = {
  date: string;
  value: number;
  costBasis?: number;
  cashFlow?: number;
  benchmark?: number;
};

export type PortfolioTrend = {
  timeframe: string;
  series: PortfolioTrendPoint[];
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

export type MoversWindow = {
  gainers: PortfolioMover[];
  losers: PortfolioMover[];
};

export type DistributionSlice = {
  key: string;
  label: string;
  totalValue: number;
  quantity: number;
  percentage: number;
  averagePrice: number;
};

export type PortfolioDistributions = {
  set: DistributionSlice[];
  finish: DistributionSlice[];
  colorIdentity: DistributionSlice[];
  format: DistributionSlice[];
  rarity: DistributionSlice[];
};

export type HeatmapCell = {
  x: string;
  y: string;
  totalValue: number;
  quantity: number;
  percentage: number;
};

export type PortfolioHeatmap = {
  x: string[];
  y: string[];
  cells: HeatmapCell[];
  metric: 'value';
};

export type PortfolioHeatmaps = {
  formatByColor: PortfolioHeatmap;
  rarityByFinish: PortfolioHeatmap;
};

export type PortfolioVolatilityItem = {
  cardId: string;
  name: string;
  setCode: string;
  finish: string;
  volatilityScore: number;
  classification: 'STABLE' | 'WATCH' | 'SPECULATIVE';
  sparkline: number[];
  priceNow: number;
  priceChangePercent: number | null;
  listingsCount?: number;
  buylistCount?: number;
  buylistHigh?: number;
  demandScore?: number;
};

export type PortfolioVolatility = {
  summary: {
    stable: number;
    watch: number;
    speculative: number;
  };
  items: PortfolioVolatilityItem[];
};

export type WatchlistHighlight = {
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

export type WatchlistSummary = {
  upcoming: WatchlistHighlight[];
  triggered: WatchlistHighlight[];
};

export type TrendIndicator = {
  direction: 'UP' | 'DOWN' | 'FLAT';
  percentage: number | null;
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
  movers: MoversWindow;
  trend: PortfolioTrend;
  distributions: PortfolioDistributions;
  heatmaps: PortfolioHeatmaps;
  moversByWindow: {
    daily: MoversWindow;
    weekly: MoversWindow;
    monthly: MoversWindow;
  };
  volatility: PortfolioVolatility;
  watchlist: WatchlistSummary;
  trendIndicators: Record<string, TrendIndicator>;
  lastUpdated: string;
};
