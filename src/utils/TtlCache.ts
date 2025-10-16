type TtlCacheItem<T> = {
  value: T;
  ttl: number;
};

export class TtlCache<T> {
  private cache: Record<string, TtlCacheItem<T>> = {};

  constructor() {}

  get(key: string): T | undefined {
    this.prune();
    const item = this.cache[key];
    if (item && item.ttl > Date.now()) {
      return item.value;
    }
    return undefined;
  }

  set(key: string, value: T, ttl: number) {
    this.cache[key] = { value, ttl: Date.now() + ttl };
    this.prune();
  }

  private prune() {
    const now = Date.now();
    const keys = Object.keys(this.cache);
    const keysToDelete = keys.filter((key) => this.cache[key]?.ttl && this.cache[key].ttl < now);
    for (const key of keysToDelete) {
      delete this.cache[key];
    }
  }
}
