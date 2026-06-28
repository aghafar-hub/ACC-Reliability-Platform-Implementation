// platform/shared-types/src/locale.ts
// Locale and theme primitives for the ACC Reliability Platform.
//
// Used by the auth context (current user language/theme), settings service,
// and SDK.  Defined here to avoid circular dependencies between packages.

/** Known platform UI locales. */
export const KNOWN_LOCALES = ['en', 'ar'] as const;

/** Union of known locale code literals. */
export type KnownLocaleCode = typeof KNOWN_LOCALES[number];

/**
 * UI locale code.
 * Use a {@link KnownLocaleCode} for built-in locales; the `string` extension
 * allows future locales without a platform-wide schema change.
 */
export type LocaleCode = KnownLocaleCode | (string & Record<never, never>);

/** Known platform UI themes. */
export const KNOWN_THEMES = ['light', 'dark'] as const;

/** Union of known theme id literals. */
export type KnownThemeId = typeof KNOWN_THEMES[number];

/**
 * UI theme identifier.
 * Use a {@link KnownThemeId} for built-in themes; the `string` extension
 * allows custom themes without a platform-wide schema change.
 */
export type ThemeId = KnownThemeId | (string & Record<never, never>);
