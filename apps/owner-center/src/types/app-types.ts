// apps/owner-center/src/types/app-types.ts
// Application-level types for the Owner Center shell.
//
// Re-exports platform primitive types (ThemeId, LocaleCode) and defines
// the shell-level state shapes consumed by context providers.

import type { ThemeId, LocaleCode } from '@acc-reliability/shared-types';
import type { UserContext } from '@acc-reliability/sdk';
import type { BrandingConfig } from './branding-types';
import type { TourState, GuideTourId } from './tour-types';

export type { ThemeId, LocaleCode };

// ── Auth state ────────────────────────────────────────────────────────────────

/** Lifecycle status of the authentication flow. */
export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

/**
 * Immutable snapshot of the current authentication state.
 * Held in AuthContext and consumed by layout and route guards.
 */
export interface AuthState {
  readonly status: AuthStatus;
  /** Authenticated user context; null when status is not 'authenticated'. */
  readonly user: UserContext | null;
  /** Human-readable error message when status is 'unauthenticated' due to a failure. */
  readonly error: string | null;
}

// ── Context value shapes ──────────────────────────────────────────────────────

/** Value exposed by ThemeContext. */
export interface ThemeContextValue {
  readonly theme: ThemeId;
  readonly setTheme: (theme: ThemeId) => void;
}

/** Value exposed by LanguageContext. */
export interface LanguageContextValue {
  readonly locale: LocaleCode;
  readonly setLocale: (locale: LocaleCode) => void;
}

/** Value exposed by BrandingContext. */
export interface BrandingContextValue {
  readonly branding: BrandingConfig;
  /** Replace branding at runtime (e.g. after contractor profile loads). */
  readonly setBranding: (config: BrandingConfig) => void;
}

/** Value exposed by TourContext. */
export interface TourContextValue {
  readonly tourState: TourState;
  /** Begin a named guided tour from its first step. No-op if already active. */
  readonly startTour: (tourId: GuideTourId) => void;
  /** End any active tour and reset state. */
  readonly endTour: () => void;
}
