// platform/cache/src/cache-service.ts
// High-level Platform Cache Service interface.
//
// ICacheService is the facade consumed by Platform Services and (via the SDK)
// by business modules.  It is built on top of ICacheProvider and adds
// user-scoped invalidation, batch preload, and health reporting.
//
// Business modules must never use ICacheProvider directly (CACHE-002).
// All cache access must go through the SDK → ICacheService path.

import type { CacheKey, CacheCategory } from './cache-key';
import type { CacheTtl } from './cache-ttl';
import type { CacheEntry } from './cache-entry';
import type { CacheInvalidationRequest } from './cache-invalidation';
import type { CacheStats } from './cache-stats';
import type { CacheLevel } from './cache-provider';

// ── Preload descriptor ────────────────────────────────────────────────────────

/**
 * A single entry descriptor passed to {@link ICacheService.preload}.
 *
 * The `loader` function is called lazily during the preload pass only if
 * the key is not already present in the cache.
 */
export interface CachePreloadEntry {
  /** Fully-qualified cache key to populate. */
  readonly key: CacheKey;
  /** Function that produces the value when a cache miss is detected. */
  readonly loader: () => unknown;
  /** TTL for the stored entry.  Defaults to the category's standard TTL when omitted. */
  readonly ttlMs?: CacheTtl | undefined;
}

// ── ICacheService ─────────────────────────────────────────────────────────────

/**
 * Platform Cache Service — high-level cache facade.
 *
 * All platform services and SDK clients interact with the cache through this
 * interface.  The underlying provider tier (L1/L2/L3) is transparent to callers.
 *
 * Design rules (PS-121):
 *  - CACHE-001 One centralized instance serves the platform.
 *  - CACHE-002 Business modules access cache only via the SDK, not directly here.
 *  - CACHE-003 Frequently accessed data must be cached.
 *  - CACHE-004 Invalidation occurs automatically after data changes.
 *  - CACHE-005 Cache must respect contractor isolation and permissions.
 */
export interface ICacheService {
  /**
   * Returns the cached value for `key`, or `null` on a miss or expired entry.
   *
   * @typeParam T Expected type of the cached value.
   * @param key Fully-qualified cache key.
   */
  get<T>(key: CacheKey): T | null;

  /**
   * Returns the full {@link CacheEntry} envelope for `key`, or `null` on a miss.
   *
   * Use this when metadata (createdAt, expiresAt, hitCount) is needed
   * alongside the value.
   *
   * @param key Fully-qualified cache key.
   */
  getEntry<T>(key: CacheKey): CacheEntry<T> | null;

  /**
   * Stores `value` under `key`.
   *
   * An existing entry for the same key is overwritten.  When `ttlMs` is
   * omitted, the category's default TTL from {@link CATEGORY_DEFAULT_TTL}
   * is applied if the key conforms to the standard format; otherwise no
   * automatic expiry is set.
   *
   * @param key   Fully-qualified cache key.
   * @param value Value to cache; must be serialisable for non-memory providers.
   * @param ttlMs Optional TTL in milliseconds.
   */
  set<T>(key: CacheKey, value: T, ttlMs?: CacheTtl): void;

  /**
   * Executes a {@link CacheInvalidationRequest}, removing matching entries
   * from all provider levels (PS-121 §8).
   *
   * Called automatically by platform services after data writes; may also
   * be called manually for administrative cache flushes.
   *
   * @param request Describes the scope and target of the invalidation.
   */
  invalidate(request: CacheInvalidationRequest): void;

  /**
   * Invalidates all cache entries associated with `userId`.
   *
   * Called by the Authentication Service on sign-out and by the Permission
   * Service when a user's roles change (PS-121 §12).
   *
   * @param userId Platform user identifier.
   */
  invalidateForUser(userId: string): void;

  /**
   * Invalidates all cache entries for the given category.
   *
   * Convenience method equivalent to calling {@link invalidate} with
   * `scope: 'CATEGORY'`.
   *
   * @param category Cache category to flush.
   */
  invalidateCategory(category: CacheCategory): void;

  /**
   * Batch-populates the cache from a list of loader descriptors.
   *
   * Used during platform startup to preload critical data (e.g. settings,
   * permissions, equipment master) before the first user request arrives
   * (PS-121 §10).  Each `loader` is called only when the key is absent.
   *
   * @param entries Array of preload descriptors.
   */
  preload(entries: readonly CachePreloadEntry[]): Promise<void>;

  /**
   * Returns a performance snapshot for the active cache level.
   *
   * Consumed by the Health Monitor Service for dashboard reporting.
   */
  getStats(): CacheStats;

  /**
   * Performs a lightweight self-check and returns the cache health state.
   *
   * Must never throw.  Used by the Health Monitor during periodic checks.
   */
  healthCheck(): Promise<{ healthy: boolean; level: CacheLevel; reason?: string }>;
}
