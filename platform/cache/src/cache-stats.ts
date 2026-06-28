// platform/cache/src/cache-stats.ts
// Cache statistics and monitoring types for the ACC Reliability Platform.
//
// The Health Monitor Service reads these statistics to track cache
// performance (PS-121 §11): hit ratio, miss ratio, size, latency, etc.

import type { CacheLevel } from './cache-provider';

// ── CacheStats ────────────────────────────────────────────────────────────────

/**
 * Point-in-time performance snapshot for a single cache provider level.
 *
 * Produced by {@link ICacheMonitor.getStats} and consumed by the
 * Health Monitor Service.
 */
export interface CacheStats {
  /** Physical cache level these stats describe. */
  readonly level: CacheLevel;

  /** Total number of successful cache retrievals since the last reset. */
  readonly hits: number;

  /** Total number of cache misses (key absent or expired) since the last reset. */
  readonly misses: number;

  /**
   * Ratio of hits to total lookups: `hits / (hits + misses)`.
   * `0` when no lookups have occurred.  Range: [0, 1].
   */
  readonly hitRatio: number;

  /** Current number of unexpired entries held in the cache. */
  readonly size: number;

  /**
   * Number of entries that were evicted due to TTL expiry since the last reset.
   * High values indicate entries are being stored with too short a TTL.
   */
  readonly expiredCount: number;

  /** ISO 8601 timestamp when these statistics were collected. */
  readonly collectedAt: string;
}

// ── ICacheMonitor ─────────────────────────────────────────────────────────────

/**
 * Cache monitoring interface exposing performance statistics.
 *
 * Implemented alongside {@link ICacheProvider}.  The Health Monitor Service
 * calls {@link getStats} periodically; the App Owner sees the results on
 * the operations dashboard (PS-121 §11).
 */
export interface ICacheMonitor {
  /**
   * Returns a current performance snapshot for this cache provider level.
   */
  getStats(): CacheStats;

  /**
   * Resets all counters (`hits`, `misses`, `expiredCount`) to zero.
   *
   * Does not affect cached data.  Used by administrative tooling to take
   * fresh measurements after a cache warm-up period.
   */
  resetStats(): void;
}
