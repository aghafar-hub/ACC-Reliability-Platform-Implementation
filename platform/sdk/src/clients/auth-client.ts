// platform/sdk/src/clients/auth-client.ts
// SDK authentication client interface.
//
// Business modules consume IAuthClient; they never depend on IAuthService
// directly.  The SDK layer hides the service implementation and ensures
// all auth access goes through the approved SDK contract (PS-114 §5).

import type {
  UserContext,
  SessionInfo,
  AuthCredentials,
} from '@acc-reliability/services';

/**
 * SDK authentication client.
 *
 * Exposes the minimum authentication surface modules need:
 *  - Query current user and session state.
 *  - Initiate sign-in / sign-out.
 *  - Refresh a session that is nearing expiry.
 *
 * Modules must never implement independent authentication or store
 * credentials.  All auth state is owned by the platform.
 */
export interface IAuthClient {
  /**
   * Returns the currently authenticated user, or `null` when no session
   * is active.
   */
  getCurrentUser(): UserContext | null;

  /** `true` when a valid, non-expired session is active. */
  isAuthenticated(): boolean;

  /**
   * Authenticates with the supplied credentials and returns the resulting
   * {@link UserContext}.
   *
   * @throws {AuthenticationError} on invalid credentials.
   */
  signIn(credentials: AuthCredentials): Promise<UserContext>;

  /**
   * Terminates the current session.  Safe to call when no session is active.
   */
  signOut(): Promise<void>;

  /**
   * Extends the active session and returns a refreshed {@link UserContext}.
   *
   * @throws {SessionExpiredError} if the session cannot be renewed.
   */
  refreshSession(): Promise<UserContext>;

  /**
   * Returns public session metadata, or `null` when no session is active.
   * Safe to include in diagnostic logs (contains no credential material).
   */
  getSessionInfo(): SessionInfo | null;
}
