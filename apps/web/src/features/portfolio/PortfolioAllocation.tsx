import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import {
  PORTFOLIO_DIMENSIONS,
  PORTFOLIO_METRICS,
  PORTFOLIO_PIE_COLORS,
} from './constants';
import type { PortfolioSummary } from './types';
import { formatCurrency, formatPercent } from '../../shared/utils/format';

type PortfolioAllocationProps = {
  summary: PortfolioSummary | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

type PieDatum = {
  key: string;
  label: string;
  value: number;
  percentage: number;
};

export function PortfolioAllocation({ summary, loading, error, onRetry }: PortfolioAllocationProps) {
  const [dimension, setDimension] = useState<(typeof PORTFOLIO_DIMENSIONS)[number]['id']>('set');
  const [metric, setMetric] = useState<(typeof PORTFOLIO_METRICS)[number]['id']>('value');

  const pieData = useMemo<PieDatum[]>(() => {
    const current = summary?.distributions?.[dimension] ?? [];
    return current.slice(0, 12).map((slice) => {
      let value = slice.totalValue;
      if (metric === 'quantity') {
        value = slice.quantity;
      } else if (metric === 'averagePrice') {
        value = slice.averagePrice;
      }
      return {
        key: slice.key,
        label: slice.label,
        value,
        percentage: slice.percentage,
      };
    });
  }, [summary, dimension, metric]);

  if (loading) {
    return <div className="panel muted">Loading allocation breakdown…</div>;
  }

  if (error) {
    return (
      <div className="panel error">
        <div className="panel-heading">
          <strong>Unable to load allocation data</strong>
        </div>
        <p>{error}</p>
        <button type="button" className="ghost-button" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  if (!summary || pieData.length === 0) {
    return (
      <div className="panel muted empty-state">
        <h3>No allocation data available.</h3>
        <p>Add cards to your collection and take another snapshot to see the distribution chart.</p>
        <button type="button" className="ghost-button" onClick={onRetry}>
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="panel">
      <header className="portfolio-section-header">
        <div>
          <h3>Allocation breakdown</h3>
          <p className="muted">Compare the relative weight of formats, sets, and finishes.</p>
        </div>
        <div className="chip-group">
          {PORTFOLIO_DIMENSIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={clsx('chip', option.id === dimension && 'chip-active')}
              onClick={() => setDimension(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <div className="chip-group metric-group">
        {PORTFOLIO_METRICS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={clsx('chip', option.id === metric && 'chip-active')}
            onClick={() => setMetric(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="distribution-chart">
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={pieData}
              innerRadius={78}
              outerRadius={122}
              paddingAngle={2}
              dataKey="value"
              nameKey="label"
              startAngle={90}
              endAngle={-270}
              label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
            >
              {pieData.map((entry, index) => (
                <Cell key={entry.key} fill={PORTFOLIO_PIE_COLORS[index % PORTFOLIO_PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number | string, name: string) => {
                const numericValue = Number(value ?? 0);
                if (metric === 'quantity') {
                  return [numericValue.toFixed(2), name];
                }
                if (metric === 'averagePrice') {
                  return [formatCurrency(numericValue), `${name} avg`];
                }
                return [formatCurrency(numericValue), name];
              }}
              contentStyle={{
                background: 'rgba(12,16,28,0.95)',
                borderRadius: 12,
                border: '1px solid rgba(148,163,184,0.24)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <ul className="distribution-legend">
          {pieData.map((slice, index) => (
            <li key={slice.key}>
              <span
                className="legend-swatch"
                style={{ background: PORTFOLIO_PIE_COLORS[index % PORTFOLIO_PIE_COLORS.length] }}
              />
              <div>
                <strong>{slice.label}</strong>
                <small>{formatPercent(slice.percentage)}</small>
              </div>
              <span>
                {metric === 'quantity'
                  ? Number(slice.value).toFixed(2)
                  : formatCurrency(Number(slice.value))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
