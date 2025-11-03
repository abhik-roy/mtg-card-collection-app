type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class LruCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(private readonly capacity: number, private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    this.store.delete(key);
    this.store.set(key, entry);

    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });

    if (this.store.size > this.capacity) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }
  }
}
