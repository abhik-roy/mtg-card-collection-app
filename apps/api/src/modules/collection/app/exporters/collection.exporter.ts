import { CollectionListItem } from '../../domain/repositories/collection.repository';

export type CollectionExportFormat = 'moxfield' | 'csv';

export interface CollectionExportOptions {
  includePrices?: boolean;
}

export interface CollectionExportResult {
  filename: string;
  contentType: string;
  content: Buffer;
}

const CSV_BASE_HEADERS = [
  'Quantity',
  'Name',
  'Set Code',
  'Collector Number',
  'Finish',
  'Condition',
  'Language',
  'Location',
];

export function exportCollection(
  format: CollectionExportFormat,
  items: CollectionListItem[],
  options: CollectionExportOptions,
): CollectionExportResult {
  if (format === 'moxfield') {
    return createMoxfieldExport(items);
  }

  if (format === 'csv') {
    return createCsvExport(items, options);
  }

  throw new Error(`Unsupported export format: ${format}`);
}

function createMoxfieldExport(items: CollectionListItem[]): CollectionExportResult {
  const lines = items.map((item) => {
    const finishTag = item.finish !== 'NONFOIL' ? `[${item.finish}]` : '';
    const conditionTag = item.condition !== 'NM' ? `{${item.condition}}` : '';
    const languageTag = item.language && item.language !== 'en' ? `<${item.language}>` : '';
    const locationTag = item.location ? `@${item.location}` : '';

    return [
      item.quantity,
      item.name,
      `(${item.setCode})`,
      item.collectorNumber,
      finishTag,
      conditionTag,
      languageTag,
      locationTag,
    ]
      .filter(Boolean)
      .join(' ');
  });

  const header = '# Moxfield Decklist Generated from MTG Collection';
  const body = [header, ...lines].join('\n');

  return {
    filename: `collection-moxfield-${timestamp()}.txt`,
    contentType: 'text/plain; charset=utf-8',
    content: Buffer.from(body, 'utf8'),
  };
}

function createCsvExport(
  items: CollectionListItem[],
  options: CollectionExportOptions,
): CollectionExportResult {
  const rows: string[] = [];
  const headers = [...CSV_BASE_HEADERS];

  if (options.includePrices) {
    headers.push('Price (USD)', 'Price (USD Foil)');
  }

  rows.push(headers.map(escapeCsv).join(','));

  items.forEach((item) => {
    const baseColumns = [
      String(item.quantity),
      item.name,
      item.setCode,
      item.collectorNumber,
      item.finish,
      item.condition,
      item.language,
      item.location ?? '',
    ];

    if (options.includePrices) {
      baseColumns.push(
        item.usd !== undefined && item.usd !== null ? item.usd.toFixed(2) : '',
        item.usdFoil !== undefined && item.usdFoil !== null ? item.usdFoil.toFixed(2) : '',
      );
    }

    rows.push(baseColumns.map(escapeCsv).join(','));
  });

  const csvContent = rows.join('\n');

  return {
    filename: `collection-export-${timestamp()}.csv`,
    contentType: 'text/csv; charset=utf-8',
    content: Buffer.from(csvContent, 'utf8'),
  };
}

function escapeCsv(value: string): string {
  if (value === undefined || value === null) {
    return '';
  }

  const stringValue = String(value);
  const needsQuotes = /[",\n]/.test(stringValue);
  if (!needsQuotes) {
    return stringValue;
  }

  return `"${stringValue.replace(/"/g, '""')}"`;
}

function timestamp(): string {
  const date = new Date();
  return date.toISOString().replace(/[:.]/g, '-');
}
