// Cache system for AI calculations
interface CacheEntry {
  depth: number;
  value: number;
  move: [number, number] | null;
  path: Array<[number, number]>;
  role: number;
  onlyThree?: boolean;
  onlyFour?: boolean;
}

class Cache {
  private cache: Map<number, CacheEntry>;
  private maxSize: number;

  constructor(maxSize = 100000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(hash: number): CacheEntry | null {
    return this.cache.get(hash) || null;
  }

  put(hash: number, entry: CacheEntry): void {
    if (this.cache.size >= this.maxSize) {
      // Simple LRU: remove the first entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(hash, entry);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export default Cache;
