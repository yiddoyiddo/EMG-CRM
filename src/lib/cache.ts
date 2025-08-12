import LRU from 'lru-cache';

// Enhanced cache configuration for better performance
const cache = new LRU({
  max: 1000, // Increased cache size
  ttl: 1000 * 60 * 10, // 10 minutes default TTL
  updateAgeOnGet: true, // Update age when accessed
  allowStale: true, // Allow stale values while updating
});

// Cache keys for different data types
export const CACHE_KEYS = {
  EXECUTIVE_DASHBOARD: 'exec-dashboard',
  PIPELINE_ITEMS: 'pipeline-items',
  FINANCE_ANALYTICS: 'finance-analytics',
  BDR_PERFORMANCE: 'bdr-performance',
  KPI_TARGETS: 'kpi-targets',
} as const;

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

// Enhanced cache functions with specific TTLs
export function setCacheWithTTL<T>(key: string, value: T, ttlMinutes: number = 10) {
  cache.set(key, value, { ttl: ttlMinutes * 60 * 1000 });
}

// Cache invalidation
export function invalidateCache(pattern: string) {
  const keys = cache.keys();
  keys.forEach(key => {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  });
}

// Cache statistics
export function getCacheStats() {
  return {
    size: cache.size,
    max: cache.max,
    ttl: cache.ttl,
    hits: cache.hits,
    misses: cache.misses,
  };
} 