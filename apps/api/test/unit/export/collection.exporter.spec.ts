import { exportCollection } from '../../../src/modules/collection/app/exporters/collection.exporter';
import type { CollectionListItem } from '../../../src/modules/collection/domain/repositories/collection.repository';

describe('Collection exporter', () => {
  const sampleItems: CollectionListItem[] = [
    {
      id: '1',
      cardId: 'card-1',
      quantity: 3,
      finish: 'FOIL',
      condition: 'NM',
      language: 'en',
      location: 'Binder A',
      name: 'Lightning Bolt',
      setCode: '2ED',
      collectorNumber: '150',
      imageSmall: undefined,
      usd: 2.5,
      usdFoil: 9.99,
    },
    {
      id: '2',
      cardId: 'card-2',
      quantity: 1,
      finish: 'NONFOIL',
      condition: 'LP',
      language: 'jp',
      location: undefined,
      name: 'Brainstorm',
      setCode: 'ICE',
      collectorNumber: '73',
      imageSmall: undefined,
      usd: undefined,
      usdFoil: undefined,
    },
  ];

  it('creates a Moxfield export with formatted lines', () => {
    const result = exportCollection('moxfield', sampleItems, { includePrices: false });
    const text = result.content.toString('utf8');

    expect(result.filename).toContain('collection-moxfield-');
    expect(result.contentType).toBe('text/plain; charset=utf-8');
    expect(text).toContain('# Moxfield Decklist Generated from MTG Collection');
    expect(text).toContain('3 Lightning Bolt (2ED) 150 [FOIL]');
    expect(text).toContain('1 Brainstorm (ICE) 73 {LP} <jp>');
  });

  it('creates a CSV export with optional price columns', () => {
    const result = exportCollection('csv', sampleItems, { includePrices: true });
    const csv = result.content.toString('utf8');

    expect(result.filename).toContain('collection-export-');
    expect(result.contentType).toBe('text/csv; charset=utf-8');
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Quantity,Name,Set Code,Collector Number,Finish,Condition,Language,Location,Price (USD),Price (USD Foil)');
    expect(lines[1]).toBe('3,Lightning Bolt,2ED,150,FOIL,NM,en,Binder A,2.50,9.99');
    expect(lines[2].split(',')).toEqual([
      '1',
      'Brainstorm',
      'ICE',
      '73',
      'NONFOIL',
      'LP',
      'jp',
      '',
      '',
      '',
    ]);
  });

  it('throws on unknown format', () => {
    expect(() => exportCollection('unknown' as any, sampleItems, {})).toThrow('Unsupported export format');
  });
});
