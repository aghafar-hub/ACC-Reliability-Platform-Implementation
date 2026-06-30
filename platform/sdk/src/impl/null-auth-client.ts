// platform/sdk/src/impl/null-auth-client.ts
// Placeholder IAuthClient — authentication is not yet implemented.
//
// All read methods return safe null/false defaults.
// All write methods throw a typed not-implemented error.
// Replace with a real implementation in the authentication milestone.

import { PlatformError } from '@acc-reliability/kernel';
import type { AuthCredentials, UserContext, SessionInfo } from '@acc-reliability/services';
import type { IAuthClient } from '../clients/auth-client';

/**
 * No-op authentication client used during the pre-auth bootstrap phase.
 *
 * @remarks
 * Registered under the `auth` slot in {@link PlatformSdk} until the
 * authentication milestone is wired.  Modules that call {@link signIn} or
 * {@link refreshSession} will receive a clear not-implemented error rather
 * than a silent failure.
 */
export class NullAuthClient implements IAuthClient {
  getCurrentUser(): UserContext | null {
    return null;
  }

  isAuthenticated(): boolean {
    return false;
  }

  async signIn(_credentials: AuthCredentials): Promise<UserContext> {
    throw new PlatformError(
      'Authentication is not yet implemented. Wire a real IAuthService before calling signIn().',
      'AUTH_NOT_IMPLEMENTED',
    );
  }

  async signOut(): Promise<void> {
    // No-op — no session to terminate.
  }

  async refreshSession(): Promise<UserContext> {
    throw new PlatformError(
      'Authentication is not yet implemented. Wire a real IAuthService before calling refreshSession().',
      'AUTH_NOT_IMPLEMENTED',
    );
  }

  getSessionInfo(): SessionInfo | null {
    return null;
  }
}
