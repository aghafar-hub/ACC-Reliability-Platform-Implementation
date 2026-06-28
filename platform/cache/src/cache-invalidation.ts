// platform/cache/src/cache-invalidation.ts
// Cache invalidation request types for the ACC Reliability Platform.
//
// Invalidation is triggered when data changes, permissions change, or an
// administrative refresh is requested (PS-121 §8).

import type { CacheKey, CacheCategory } from './cache-key';

// ── Invalidation scope ────────────────────────────────────────────────────────

/**
 * Discriminant that determines which entries are cleared.
 *
 *  - `'SINGLE'`   — Remove exactly one entry identified by `key`.
 *  - `'PREFIX'`   — Remove all entries whose key starts with `prefix`.
 *  - `'CATEGORY'` — Remove all entries belonging to `category`.
 *  - `'ALL'`      — Flush the entire cache.  Use only for emergency resets
 *                   or platform restarts.
 */
export type CacheInvalidationScope = 'SINGLE' | 'PREFIX' | 'CATEGORY' | 'ALL';

// ── CacheInvalidationRequest ──────────────────────────────────────────────────

/**
 * Describes a cache invalidation operation submitted to {@link ICacheService.invalidate}.
 *
 * The `scope` field is the discriminant; additional fields are required or
 * optional depending on the scope:
 *
 * | scope        | required fields | optional fields |
 * |--------------|-----------------|-----------------|
 * | `'SINGLE'`   | `key`           | `reason`        |
 * | `'PREFIX'`   | `prefix`        | `reason`        |
 * | `'CATEGORY'` | `category`      | `reason`        |
 * | `'ALL'`      | —               | `reason`        |
 */
export interface CacheInvalidationRequest {
  /** Determines the breadth of the invalidation operation. */
  readonly scope: CacheInvalidationScope;

  /**
   * Specific cache key to remove.
   * Required when `scope` is `'SINGLE'`; ignored otherwise.
   */
  readonly key?: CacheKey | undefined;

  /**
   * Key prefix used for bulk removal.
   * Required when `scope` is `'PREFIX'`; ignored otherwise.
   * Example: `'USER:'` clears all user cache entries.
   */
  readonly prefix?: string | undefined;

  /**
   * Cache category to flush.
   * Required when `scope` is `'CATEGORY'`; ignored otherwise.
   */
  readonly category?: CacheCategory | undefined;

  /**
   * Human-readable reason for the invalidation.
   * Recorded in cache monitoring logs for operational traceability.
   * Optional for all scopes.
   */
  readonly reason?: string | undefined;
}
