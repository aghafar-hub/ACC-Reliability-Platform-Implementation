// platform/shared-types/src/index.ts
// Public API surface for @acc-reliability/shared-types.
//
// Zero internal dependencies — this package is the foundation layer.
// All other platform packages may import from here.

// ── Timestamp ─────────────────────────────────────────────────────────────────
export type { IsoTimestamp } from './timestamp';
export { createIsoTimestamp, nowIso } from './timestamp';

// ── Service Result ────────────────────────────────────────────────────────────
export type { Ok, Err, ServiceResult } from './result';
export { ok, err, isOk, isErr } from './result';

// ── Locale and Theme ──────────────────────────────────────────────────────────
export type { KnownLocaleCode, LocaleCode, KnownThemeId, ThemeId } from './locale';
export { KNOWN_LOCALES, KNOWN_THEMES } from './locale';

// ── Version ───────────────────────────────────────────────────────────────────
export type { SemVer, PlatformVersion } from './version';
export { createSemVer } from './version';
