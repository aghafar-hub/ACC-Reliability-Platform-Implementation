// apps/owner-center/src/types/branding-overview-types.ts
// Read-only branding overview derived from existing shell infrastructure.
//
// Aggregates ThemeContext, BrandingContext, KNOWN_THEMES, shell CSS tokens,
// and PWA manifest metadata. No persistence, no API calls.

import type { KnownThemeId, ThemeId } from '@acc-reliability/shared-types';
import type { BrandingConfig } from './branding-types';

/** Platform-supported theme ids — mirrors {@link KNOWN_THEMES} in shared-types. */
const SUPPORTED_THEMES = ['light', 'dark'] as const satisfies readonly KnownThemeId[];

// ── Shell theme tokens (mirrors shell.css :root) ──────────────────────────────

/** Platform accent colours per built-in theme — mirrors shell.css custom properties. */
export const PLATFORM_THEME_TOKENS = {
  light: {
    accent: '#0071bc',
    primary: '#1a3a5c',
  },
  dark: {
    accent: '#4da3e0',
    primary: '#1e4a7a',
  },
} as const;

// ── PWA / application icon metadata (mirrors manifest.webmanifest) ────────────

export interface PwaIconEntry {
  readonly src: string;
  readonly sizes: string;
}

/** Static PWA branding metadata registered for the Owner Center shell. */
export const PWA_BRANDING = {
  themeColor: '#1a3a5c',
  backgroundColor: '#ffffff',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192' },
    { src: '/icons/icon-512.png', sizes: '512x512' },
  ] as const satisfies readonly PwaIconEntry[],
} as const;

// ── Platform branding rules ───────────────────────────────────────────────────

export interface BrandingRule {
  readonly en: string;
  readonly ar: string;
}

/** Canonical platform branding display rules — read-only reference. */
export const BRANDING_RULES: readonly BrandingRule[] = [
  {
    en: 'ACC branding is always displayed first.',
    ar: 'تُعرض علامة ACC التجارية دائماً أولاً.',
  },
  {
    en: 'Contractor logo is displayed beneath ACC when applicable.',
    ar: 'يُعرض شعار المقاول أسفل ACC عند الاقتضاء.',
  },
  {
    en: 'Engineering identifiers are never branded.',
    ar: 'لا تُعلَّم معرّفات الهندسة أبداً.',
  },
  {
    en: 'Branding must remain consistent across all modules.',
    ar: 'يجب أن تبقى العلامة التجارية متسقة عبر جميع الوحدات.',
  },
] as const;

// ── Theme catalogue ───────────────────────────────────────────────────────────

export interface PlatformThemeEntry {
  readonly id: KnownThemeId;
  readonly name: { readonly en: string; readonly ar: string };
  readonly accentColor: string;
}

/** Built-in themes registered by the shell theme system. */
export const PLATFORM_THEMES: readonly PlatformThemeEntry[] = SUPPORTED_THEMES.map((id) => {
  if (id === 'light') {
    return {
      id: 'light' as const,
      name: { en: 'Light', ar: 'فاتح' },
      accentColor: PLATFORM_THEME_TOKENS.light.accent,
    };
  }
  return {
    id: 'dark' as const,
    name: { en: 'Dark', ar: 'داكن' },
    accentColor: PLATFORM_THEME_TOKENS.dark.accent,
  };
});

// ── Overview metrics ──────────────────────────────────────────────────────────

export interface BrandingOverview {
  readonly activeThemeId: ThemeId;
  readonly activeThemeName: { readonly en: string; readonly ar: string };
  readonly availableThemeCount: number;
  readonly brandingAssetCount: number;
  readonly currentLogoLabel: string;
  readonly darkThemeSupported: boolean;
  readonly accentColor: string;
  readonly accLogoLabel: string;
  readonly contractorLogoSupported: boolean;
  readonly contractorLogoActive: boolean;
  readonly applicationIcons: readonly PwaIconEntry[];
  readonly darkThemeIconConfigured: boolean;
  readonly lightModeSupported: boolean;
  readonly darkModeSupported: boolean;
  readonly systemThemeSupported: boolean;
  readonly mobileIconSupported: boolean;
}

function resolveAccLogoLabel(branding: BrandingConfig): string {
  const { acc } = branding;
  if (acc.logoSrc !== undefined) return acc.logoSrc;
  if (acc.appName !== undefined) return acc.appName;
  return 'ACC Reliability Platform';
}

function countBrandingAssets(branding: BrandingConfig): number {
  let count = PWA_BRANDING.icons.length;
  if (branding.acc.logoSrc !== undefined) count += 1;
  if (branding.contractor?.logoSrc !== undefined) count += 1;
  return count;
}

function resolveThemeName(themeId: ThemeId): { en: string; ar: string } {
  const known = PLATFORM_THEMES.find((entry) => entry.id === themeId);
  if (known !== undefined) return known.name;
  return { en: themeId, ar: themeId };
}

function resolveAccentColor(themeId: ThemeId): string {
  if (themeId === 'dark') return PLATFORM_THEME_TOKENS.dark.accent;
  if (themeId === 'light') return PLATFORM_THEME_TOKENS.light.accent;
  return PLATFORM_THEME_TOKENS.light.accent;
}

/** Compute overview metrics from live shell branding and theme state. */
export function getBrandingOverview(
  branding: BrandingConfig,
  activeThemeId: ThemeId,
): BrandingOverview {
  return {
    activeThemeId,
    activeThemeName: resolveThemeName(activeThemeId),
    availableThemeCount: SUPPORTED_THEMES.length,
    brandingAssetCount: countBrandingAssets(branding),
    currentLogoLabel: resolveAccLogoLabel(branding),
    darkThemeSupported: SUPPORTED_THEMES.includes('dark'),
    accentColor: resolveAccentColor(activeThemeId),
    accLogoLabel: resolveAccLogoLabel(branding),
    contractorLogoSupported: true,
    contractorLogoActive: branding.contractor !== undefined,
    applicationIcons: PWA_BRANDING.icons,
    darkThemeIconConfigured: false,
    lightModeSupported: SUPPORTED_THEMES.includes('light'),
    darkModeSupported: SUPPORTED_THEMES.includes('dark'),
    systemThemeSupported: false,
    mobileIconSupported: PWA_BRANDING.icons.length > 0,
  };
}
