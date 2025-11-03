import { LruCache } from '../../../../../src/shared/infra/cache/lru.cache';

describe('LruCache', () => {
  let nowSpy: jest.SpiedFunction<typeof Date.now>;

  beforeEach(() => {
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns cached value and refreshes recency', () => {
    const cache = new LruCache<string>(2, 1_000);

    cache.set('a', 'alpha');
    cache.set('b', 'beta');

    expect(cache.get('a')).toBe('alpha');

    cache.set('c', 'gamma');

    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe('alpha');
    expect(cache.get('c')).toBe('gamma');
  });

  it('evicts entries that exceed ttl', () => {
    const cache = new LruCache<number>(1, 500);
    cache.set('ttl', 42);

    nowSpy.mockReturnValue(1_600);

    expect(cache.get('ttl')).toBeUndefined();
  });

  it('evicts oldest entry when capacity exceeded', () => {
    const cache = new LruCache<number>(2, 10_000);
    cache.set('one', 1);
    cache.set('two', 2);
    cache.set('three', 3);

    expect(cache.get('one')).toBeUndefined();
    expect(cache.get('two')).toBe(2);
    expect(cache.get('three')).toBe(3);
  });
});
