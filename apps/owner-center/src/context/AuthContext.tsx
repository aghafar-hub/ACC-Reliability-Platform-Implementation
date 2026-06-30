// apps/owner-center/src/context/AuthContext.tsx
// Authentication context — wraps the Platform SDK auth client and exposes
// reactive auth state to the component tree.
//
// Design constraints (per PS-101):
//  - All auth operations flow through sdk.auth — no component calls a service directly.
//  - Audit events are emitted inside AuthService, never inside this file.
//  - AuthProvider must be nested inside SdkProvider so usePlatformSdk() works.
//  - useAuth() is the only approved way for components to read auth state.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { AuthCredentials, UserContext } from '@acc-reliability/sdk';
import type { AuthContextValue, AuthState } from '../types/app-types';
import { usePlatformSdk } from './SdkContext';

// ── SDK context sync ───────────────────────────────────────────────────────────

/**
 * Updates the SDK session context so that all permission and audit clients
 * evaluate against the signed-in user rather than the bootstrap system user.
 *
 * `PlatformSdk` is shallow-frozen (`Object.freeze(this)`) but the `SdkContext`
 * object it holds is a plain JS object — its properties remain writable at
 * runtime.  TypeScript's `readonly` modifier is compile-time only; the cast
 * bypasses it deliberately so the single shared context reference stays live
 * for all `*ClientImpl` instances.
 *
 * Call BEFORE updating React state so permission checks in the first
 * re-render already reflect the new user.
 */
function syncSdkSessionUser(sdk: ReturnType<typeof usePlatformSdk>, user: UserContext): void {
  (sdk.context as { currentUser: UserContext }).currentUser = user;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Initial state ─────────────────────────────────────────────────────────────

const LOADING_STATE: AuthState = {
  status: 'loading',
  user:   null,
  error:  null,
};

// ── Provider ──────────────────────────────────────────────────────────────────

/** Props shape for the AuthProvider component. */
export interface IAuthProviderProps {
  readonly children: React.ReactNode;
}

/**
 * Provides authentication state and actions to the component tree.
 *
 * On mount, restores any session persisted in sessionStorage by checking
 * `sdk.auth.getCurrentUser()`.  All sign-in and sign-out operations update
 * the reactive state so every subscribed component re-renders automatically.
 *
 * Must be rendered inside `<SdkProvider>`.
 */
export function AuthProvider({ children }: IAuthProviderProps): React.ReactElement {
  const sdk = usePlatformSdk();
  const [authState, setAuthState] = useState<AuthState>(LOADING_STATE);
  const initialised = useRef(false);

  // Restore session from sessionStorage on first mount.
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    const currentUser = sdk.auth.getCurrentUser();

    if (currentUser !== null) {
      // Sync SDK context BEFORE the React state update so any downstream
      // permission checks in the first authenticated render are correct.
      syncSdkSessionUser(sdk, currentUser);
      setAuthState({ status: 'authenticated', user: currentUser, error: null });
    } else {
      setAuthState({ status: 'unauthenticated', user: null, error: null });
    }
  }, [sdk]);

  const login = useCallback(async (credentials: AuthCredentials): Promise<void> => {
    setAuthState(prev => ({ ...prev, status: 'loading', error: null }));
    try {
      const user = await sdk.auth.signIn(credentials);
      // Sync SDK context before React state update so permission checks in
      // the first post-login render already evaluate against the real user.
      syncSdkSessionUser(sdk, user);
      setAuthState({ status: 'authenticated', user, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setAuthState({ status: 'unauthenticated', user: null, error: message });
    }
  }, [sdk]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await sdk.auth.signOut();
    } finally {
      setAuthState({ status: 'unauthenticated', user: null, error: null });
    }
  }, [sdk]);

  const contextValue: AuthContextValue = {
    ...authState,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns the current authentication state and action functions.
 *
 * Must be called inside `<AuthProvider>`.
 *
 * @example
 * ```tsx
 * const { status, user, login, logout } = useAuth();
 * ```
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error('useAuth() must be called inside <AuthProvider>');
  }
  return ctx;
}
