// platform/cache/src/cache-ttl.ts
// Cache TTL (time-to-live) type and standard presets for the ACC Reliability Platform.
//
// TTL is expressed in milliseconds throughout the cache layer.
// Presets are configurable via the Settings Service in production;
// these defaults are the safe baseline when no configuration is present (PS-121 §7).

/**
 * Time-to-live duration expressed in milliseconds.
 *
 * A value of `0` means the entry never expires (use sparingly; prefer
 * explicit TTLs for all categories except static master data).
 *
 * Negative values are not permitted; providers must reject them.
 */
export type CacheTtl = number;

// ── Standard TTL presets ──────────────────────────────────────────────────────

/** 60 seconds — volatile data that changes frequently (e.g. live KPIs). */
export const TTL_SHORT: CacheTtl = 60_000;

/** 5 minutes — moderately stable data (e.g. user permissions in an active session). */
export const TTL_MEDIUM: CacheTtl = 5 * 60_000;

/** 30 minutes — stable reference data (e.g. equipment master, localization strings). */
export const TTL_LONG: CacheTtl = 30 * 60_000;

/** 24 hours — near-static data valid for the duration of a typical work shift. */
export const TTL_SESSION: CacheTtl = 24 * 60 * 60_000;

/**
 * No expiry.  Entry remains until explicitly invalidated or the provider is cleared.
 *
 * Use only for truly static configuration that changes only on deployment.
 */
export const TTL_NEVER: CacheTtl = 0;

// ── Per-category default TTLs ─────────────────────────────────────────────────

/**
 * Recommended default TTL per cache category (PS-121 §7).
 *
 * These are the out-of-the-box defaults.  The Settings Service may override
 * any of these values at platform startup without code changes.
 */
export const CATEGORY_DEFAULT_TTL: Readonly<Record<string, CacheTtl>> = {
  USER:              TTL_MEDIUM,
  SETTINGS:          TTL_LONG,
  PERMISSION:        TTL_MEDIUM,
  EQUIPMENT:         TTL_LONG,
  MODULE_REGISTRY:   TTL_SESSION,
  FEATURE_FLAG:      TTL_MEDIUM,
  LOCALIZATION:      TTL_SESSION,
  DASHBOARD_KPI:     TTL_SHORT,
  SEARCH_INDEX:      TTL_LONG,
  REPORT_METADATA:   TTL_LONG,
  DOCUMENT_METADATA: TTL_LONG,
} as const;
