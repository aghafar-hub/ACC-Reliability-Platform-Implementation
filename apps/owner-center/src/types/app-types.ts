// apps/owner-center/src/types/app-types.ts
// Application-level types for the Owner Center shell.
//
// Re-exports platform primitive types (ThemeId, LocaleCode) and defines
// the shell-level state shapes consumed by context providers.

import type { ThemeId, LocaleCode } from '@acc-reliability/shared-types';
import type { UserContext } from '@acc-reliability/sdk';

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
