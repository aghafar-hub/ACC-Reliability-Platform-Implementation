// apps/owner-center/src/context/AuthContext.tsx
// Authentication context and provider interface for the Owner Center shell.
//
// AuthProvider is a stub — it holds the auth state shape and exposes it
// to the component tree.  The concrete authentication flow (sign-in, token
// refresh, session persistence) is implemented in a future milestone once
// the backend auth service is wired.
//
// Per 101: no business module shall implement its own login system.
// Modules must consume auth state via useAuth(); they must not read cookies,
// localStorage, or call the auth service directly.

import React, { createContext, useContext, useState } from 'react';
import type { AuthState } from '../types/app-types';

/** Props shape for the AuthProvider component. */
export interface IAuthProviderProps {
  readonly children: React.ReactNode;
}

const AuthContext = createContext<AuthState | null>(null);

const INITIAL_AUTH_STATE: AuthState = {
  status: 'idle',
  user: null,
  error: null,
};

/**
 * Provides authentication state to the component tree.
 *
 * Stub implementation — status remains 'idle' until a concrete auth adapter
 * is registered in a future milestone.
 */
export function AuthProvider({ children }: IAuthProviderProps): React.ReactElement {
  const [authState] = useState<AuthState>(INITIAL_AUTH_STATE);

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}

/** Returns the current auth state. Must be called inside AuthProvider. */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
