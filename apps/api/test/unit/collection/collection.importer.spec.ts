import { parseCollectionImport } from '../../../src/modules/collection/app/importers/collection.importer';

describe('collection importer parser', () => {
  it('parses moxfield style lines', () => {
    const payload = '# comment\n3 Lightning Bolt (2ED) 150 [FOIL] {LP} <jp> @Binder';
    const [item] = parseCollectionImport(payload, 'auto');

    expect(item.quantity).toBe(3);
    expect(item.name).toBe('Lightning Bolt');
    expect(item.setCode).toBe('2ED');
    expect(item.collectorNumber).toBe('150');
    expect(item.finish).toBe('FOIL');
    expect(item.condition).toBe('LP');
    expect(item.language).toBe('jp');
    expect(item.location).toBe('Binder');
  });

  it('parses plain text with quantities', () => {
    const payload = '4x Brainstorm';
    const [item] = parseCollectionImport(payload, 'auto');

    expect(item.quantity).toBe(4);
    expect(item.name).toBe('Brainstorm');
    expect(item.finish).toBeUndefined();
  });

  it('falls back to quantity 1 for invalid input', () => {
    const payload = 'not a number Card Name';
    const [item] = parseCollectionImport(payload, 'plain');
    expect(item.quantity).toBe(1);
    expect(item.name).toBe('not a number Card Name');
  });
});
