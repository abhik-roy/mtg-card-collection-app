export const PORTFOLIO_TIMEFRAMES = [
  { id: '30d', label: '30D', days: 30 },
  { id: '90d', label: '90D', days: 90 },
  { id: '180d', label: '6M', days: 180 },
  { id: '365d', label: '1Y', days: 365 },
  { id: 'all', label: 'All', days: Number.POSITIVE_INFINITY },
] as const;

export const PORTFOLIO_DIMENSIONS = [
  { id: 'set', label: 'Set' },
  { id: 'finish', label: 'Finish' },
  { id: 'colorIdentity', label: 'Color Identity' },
  { id: 'format', label: 'Format' },
  { id: 'rarity', label: 'Rarity' },
] as const;

export const PORTFOLIO_METRICS = [
  { id: 'value', label: 'Value' },
  { id: 'quantity', label: 'Quantity' },
  { id: 'averagePrice', label: 'Avg Price' },
] as const;

export const PORTFOLIO_HEATMAPS = [
  { id: 'formatByColor', label: 'Formats × Colors' },
  { id: 'rarityByFinish', label: 'Rarity × Finish' },
] as const;

export const PORTFOLIO_HEATMAP_METRICS = [
  { id: 'value', label: 'Value' },
  { id: 'quantity', label: 'Quantity' },
] as const;

export const PORTFOLIO_MOVERS_WINDOWS = [
  { id: 'daily', label: '24H' },
  { id: 'weekly', label: '7D' },
  { id: 'monthly', label: '30D' },
] as const;

export const PORTFOLIO_PIE_COLORS = [
  '#7f5af0',
  '#22d3ee',
  '#94a3b8',
  '#f97316',
  '#facc15',
  '#34d399',
  '#f43f5e',
  '#a855f7',
  '#0ea5e9',
  '#ec4899',
] as const;

export type HeatmapMetric = 'value' | 'quantity';

export const VOLATILITY_BADGE = {
  STABLE: 'badge-stable',
  WATCH: 'badge-watch',
  SPECULATIVE: 'badge-speculative',
} as const;
