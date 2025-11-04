export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}

export function formatPercent(value: number | null | undefined, options?: { sign?: boolean }): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const normalized = value / 100;
  const formatted = formatter.format(normalized);
  if (options?.sign && value > 0) {
    return `+${formatted}`;
  }
  return formatted;
}
