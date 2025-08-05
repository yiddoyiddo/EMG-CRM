import LRU from 'lru-cache';

const cache = new LRU({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
});

export function getCache<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function setCache<T>(key: string, value: T, ttlMs?: number) {
  if (ttlMs && typeof ttlMs === 'number') {
    cache.set(key, value, { ttl: ttlMs });
  } else {
    cache.set(key, value);
  }
} 