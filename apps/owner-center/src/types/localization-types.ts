// apps/owner-center/src/types/localization-types.ts
// Static localization model for the Owner Center shell.
//
// Describes supported platform languages and dictionary scope metadata.
// No persistence, no translation backend — read-only overview data only.

import type { KnownLocaleCode } from '@acc-reliability/shared-types';
import { NAV_ITEMS } from './navigation-types';

/** Platform-supported locale codes — mirrors {@link KNOWN_LOCALES} in shared-types. */
const SUPPORTED_LOCALES = ['en', 'ar'] as const satisfies readonly KnownLocaleCode[];

// ── Language primitives ───────────────────────────────────────────────────────

/** Text direction for a supported locale. */
export type TextDirection = 'ltr' | 'rtl';

/** Lifecycle status of a platform language entry. */
export type LanguageStatus = 'active' | 'inactive';

/**
 * A language supported by the platform shell.
 * Derived from supported shell locales (EN + AR) — no dynamic registration yet.
 */
export interface PlatformLanguage {
  readonly code: KnownLocaleCode;
  readonly name: { readonly en: string; readonly ar: string };
  readonly direction: TextDirection;
  readonly status: LanguageStatus;
  readonly isDefault: boolean;
}

/** Default locale applied on first load and when no user preference is set. */
export const DEFAULT_LOCALE: KnownLocaleCode = 'en';

/** Canonical list of platform-supported languages (EN + AR). */
export const PLATFORM_LANGUAGES: readonly PlatformLanguage[] = SUPPORTED_LOCALES.map((code) => {
  if (code === 'en') {
    return {
      code: 'en' as const,
      name: { en: 'English', ar: 'الإنجليزية' },
      direction: 'ltr' as const,
      status: 'active' as const,
      isDefault: true,
    };
  }
  return {
    code: 'ar' as const,
    name: { en: 'Arabic', ar: 'العربية' },
    direction: 'rtl' as const,
    status: 'active' as const,
    isDefault: false,
  };
});

// ── Dictionary scope metadata ───────────────────────────────────────────────

/** A module that maintains its own translation dictionary. */
export interface ModuleDictionaryEntry {
  readonly moduleId: string;
  readonly label: { readonly en: string; readonly ar: string };
}

/** Modules with registered dictionaries (derived from shell navigation). */
export const MODULE_DICTIONARIES: readonly ModuleDictionaryEntry[] = NAV_ITEMS
  .filter((item): item is typeof item & { moduleId: string } => item.moduleId !== undefined)
  .map((item) => ({
    moduleId: item.moduleId,
    label: item.label,
  }));

/** Read-only dictionary overview metrics for summary cards and sections. */
export interface LocalizationOverview {
  readonly activeLanguageCount: number;
  readonly rtlLanguageCount: number;
  readonly defaultLanguage: PlatformLanguage;
  readonly platformLabelCount: number;
  readonly moduleDictionaryCount: number;
  readonly missingTranslationsPlaceholder: string;
}

/** Compute overview metrics from static platform language config. */
export function getLocalizationOverview(): LocalizationOverview {
  const active = PLATFORM_LANGUAGES.filter((lang) => lang.status === 'active');
  const rtl = PLATFORM_LANGUAGES.filter((lang) => lang.direction === 'rtl');
  const defaultLanguage = PLATFORM_LANGUAGES.find((lang) => lang.isDefault) ?? PLATFORM_LANGUAGES[0];

  return {
    activeLanguageCount: active.length,
    rtlLanguageCount: rtl.length,
    defaultLanguage,
    platformLabelCount: NAV_ITEMS.length,
    moduleDictionaryCount: MODULE_DICTIONARIES.length,
    missingTranslationsPlaceholder: '—',
  };
}
