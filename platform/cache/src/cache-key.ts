// platform/cache/src/cache-key.ts
// Cache key types and category definitions for the ACC Reliability Platform.
//
// All cache entries use standardized compound keys (PS-121 §6).
// Keys follow the pattern CATEGORY:IDENTIFIER (e.g. USER:USR001).
// Keys are globally unique across the entire platform.

// ── Cache categories ──────────────────────────────────────────────────────────

/**
 * Known cache categories supported by the Platform Cache Service (PS-121 §4).
 *
 * Categories drive expiration policies, invalidation rules, and monitoring
 * grouping.  Additional categories may be introduced without redesigning
 * the cache service.
 */
export const CACHE_CATEGORIES = [
  'USER',
  'SETTINGS',
  'PERMISSION',
  'EQUIPMENT',
  'MODULE_REGISTRY',
  'FEATURE_FLAG',
  'LOCALIZATION',
  'DASHBOARD_KPI',
  'SEARCH_INDEX',
  'REPORT_METADATA',
  'DOCUMENT_METADATA',
] as const;

/** Union of the known cache category literals. */
export type CacheCategory = typeof CACHE_CATEGORIES[number];

// ── Cache key ─────────────────────────────────────────────────────────────────

/**
 * Branded string representing a fully-qualified platform cache key.
 *
 * Always produced via {@link buildKey} or {@link buildPrefixKey}; never
 * constructed by concatenating raw strings.  This prevents accidental key
 * collisions across categories and contractors.
 *
 * Format: `CATEGORY:identifier` (e.g. `USER:USR001`, `EQUIPMENT:351.BC101`).
 */
export type CacheKey = string & { readonly __brand: 'CacheKey' };

/**
 * Builds a fully-qualified {@link CacheKey} from a category and an identifier.
 *
 * The identifier is trimmed and upper-cased for consistency.
 *
 * @param category Known cache category.
 * @param id       Unique identifier within the category (e.g. user id, equipment id).
 * @throws {Error} if `id` is blank.
 *
 * @example
 * buildKey('USER', 'USR001')          // → 'USER:USR001'
 * buildKey('EQUIPMENT', '351.BC101')  // → 'EQUIPMENT:351.BC101'
 */
export function buildKey(category: CacheCategory, id: string): CacheKey {
  const normalised = id.trim().toUpperCase();
  if (normalised.length === 0) throw new Error('CacheKey id cannot be empty');
  return `${category}:${normalised}` as CacheKey;
}

/**
 * Builds a category-level prefix used for bulk invalidation or prefix scans.
 *
 * Returns `CATEGORY:` (with trailing colon) so that prefix-based operations
 * match all keys belonging to the category.
 *
 * @param category Known cache category.
 *
 * @example
 * buildPrefixKey('PERMISSION')  // → 'PERMISSION:'
 */
export function buildPrefixKey(category: CacheCategory): string {
  return `${category}:`;
}
