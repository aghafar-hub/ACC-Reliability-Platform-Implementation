// platform/cache/src/cache-provider.ts
// Low-level cache provider interface and cache level discriminant.
//
// ICacheProvider is the single abstraction over all backing cache stores
// (in-memory, GAS CacheService, future Redis).  Higher-level platform
// components (ICacheService) are built on top of this interface.
//
// Providers are replaceable without module redesign (CACHE-006).

import type { CacheKey } from './cache-key';
import type { CacheEntry } from './cache-entry';
import type { CacheTtl } from './cache-ttl';

// ── Cache level ───────────────────────────────────────────────────────────────

/**
 * Physical caching tier a provider operates at (PS-121 §5).
 *
 *  - `'L1_MEMORY'`      — In-process memory store; fastest, process-local.
 *  - `'L2_GAS'`         — Google Apps Script CacheService; shared across
 *                         script executions, 6-hour maximum TTL imposed by GAS.
 *  - `'L3_DISTRIBUTED'` — Future Redis or distributed cache; cross-instance
 *                         consistency.
 */
export type CacheLevel = 'L1_MEMORY' | 'L2_GAS' | 'L3_DISTRIBUTED';

// ── ICacheProvider ────────────────────────────────────────────────────────────

/**
 * Low-level cache provider contract.
 *
 * Implementations cover exactly one {@link CacheLevel}.  The platform may
 * compose multiple providers in a tiered read-through strategy, but each
 * provider implementation is responsible only for its own level.
 *
 * All `get` results are either a populated {@link CacheEntry} (cache hit) or
 * `null` (cache miss or expired entry).  Providers must never return a stale
 * entry whose `expiresAt` is in the past.
 *
 * Design rules:
 *  - No authentication or permission checks — the service layer enforces those.
 *  - No business logic.
 *  - `healthCheck` must never throw; failures are expressed in the return value.
 */
export interface ICacheProvider {
  /** The physical caching tier this provider operates at. */
  readonly level: CacheLevel;

  /**
   * Returns the cache entry for `key`, or `null` on a miss or expired entry.
   *
   * @param key Fully-qualified cache key.
   */
  get<T>(key: CacheKey): CacheEntry<T> | null;

  /**
   * Stores `value` under `key` with an optional TTL.
   *
   * If `ttlMs` is `0` or omitted, the entry does not expire automatically.
   * An existing entry for the same key is overwritten.
   *
   * @param key   Fully-qualified cache key.
   * @param value Value to cache.  Must be serialisable for L2/L3 providers.
   * @param ttlMs Time-to-live in milliseconds.  `0` means no expiry.
   */
  set<T>(key: CacheKey, value: T, ttlMs?: CacheTtl): void;

  /**
   * Removes the entry for `key` if it exists.  No-op if the key is absent.
   *
   * @param key Fully-qualified cache key to remove.
   */
  delete(key: CacheKey): void;

  /**
   * Removes all entries whose keys begin with `prefix`.
   *
   * When `prefix` is omitted or empty, all entries are removed.
   *
   * @param prefix Optional key prefix (e.g. `'USER:'` to clear all user entries).
   */
  clear(prefix?: string): void;

  /**
   * Returns `true` if a non-expired entry exists for `key`.
   *
   * Prefer this over `get() !== null` when only existence needs to be tested
   * and the value is not needed.
   *
   * @param key Fully-qualified cache key.
   */
  has(key: CacheKey): boolean;

  /**
   * Performs a lightweight self-check and returns the provider's health state.
   *
   * Must never throw.  All failure conditions are expressed in the returned
   * object so the Health Monitor Service can consume this safely.
   */
  healthCheck(): Promise<{ healthy: boolean; level: CacheLevel; reason?: string }>;
}
