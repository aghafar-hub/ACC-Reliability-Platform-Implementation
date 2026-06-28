// platform/cache/src/index.ts
// Public API surface for @acc-reliability/cache.
//
// Zero internal dependencies — this package is consumed by platform/services,
// platform/storage, platform/sdk, and future backend/gateway packages.

// ── Cache key ─────────────────────────────────────────────────────────────────
export type { CacheKey, CacheCategory } from './cache-key';
export { CACHE_CATEGORIES, buildKey, buildPrefixKey } from './cache-key';

// ── Cache TTL ─────────────────────────────────────────────────────────────────
export type { CacheTtl } from './cache-ttl';
export {
  TTL_SHORT,
  TTL_MEDIUM,
  TTL_LONG,
  TTL_SESSION,
  TTL_NEVER,
  CATEGORY_DEFAULT_TTL,
} from './cache-ttl';

// ── Cache entry ───────────────────────────────────────────────────────────────
export type { CacheEntry } from './cache-entry';

// ── Cache provider ────────────────────────────────────────────────────────────
export type { CacheLevel, ICacheProvider } from './cache-provider';

// ── Cache invalidation ────────────────────────────────────────────────────────
export type {
  CacheInvalidationScope,
  CacheInvalidationRequest,
} from './cache-invalidation';

// ── Cache stats and monitor ───────────────────────────────────────────────────
export type { CacheStats, ICacheMonitor } from './cache-stats';

// ── Cache service ─────────────────────────────────────────────────────────────
export type { CachePreloadEntry, ICacheService } from './cache-service';
