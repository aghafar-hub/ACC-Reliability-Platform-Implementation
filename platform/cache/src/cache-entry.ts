// platform/cache/src/cache-entry.ts
// Cache entry envelope returned on a cache hit.
//
// CacheEntry<T> wraps the cached value with metadata that enables TTL
// validation, monitoring, and diagnostic inspection without requiring
// additional lookups.

import type { CacheKey, CacheCategory } from './cache-key';

/**
 * Envelope wrapping a cached value, returned by {@link ICacheProvider.get}
 * and {@link ICacheService.get} on a cache hit.
 *
 * All fields are read-only; the cache service owns the lifecycle of this object.
 *
 * @typeParam T Type of the cached value.
 */
export interface CacheEntry<T> {
  /** The fully-qualified cache key for this entry. */
  readonly key: CacheKey;

  /** The cached value. */
  readonly value: T;

  /** ISO 8601 timestamp when this entry was first stored. */
  readonly createdAt: string;

  /**
   * ISO 8601 timestamp when this entry expires.
   *
   * `undefined` when the entry was stored with {@link TTL_NEVER} (no expiry).
   * Providers must not return an entry whose `expiresAt` is in the past.
   */
  readonly expiresAt?: string | undefined;

  /**
   * Number of times this entry has been returned as a cache hit since it
   * was last stored.  Useful for identifying hot entries in monitoring.
   */
  readonly hitCount: number;

  /**
   * Cache category this entry belongs to.
   *
   * Optional: providers that do not parse the key structure may omit this.
   * When present it enables category-level statistics and invalidation.
   */
  readonly category?: CacheCategory | undefined;
}
