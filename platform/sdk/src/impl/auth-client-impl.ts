// platform/sdk/src/impl/auth-client-impl.ts
// Concrete IAuthClient — thin bridge from SDK contract to IAuthService.
//
// All logic lives in AuthService; this class translates between the SDK
// surface and the service interface without adding business rules.

import type {
  AuthCredentials,
  SessionInfo,
  UserContext,
  IAuthService,
} from '@acc-reliability/services';
import type { IAuthClient } from '../clients/auth-client';

/**
 * SDK authentication client backed by a concrete {@link IAuthService}.
 *
 * Constructed by {@link bootstrapPlatformSdk} and frozen as part of the
 * {@link PlatformSdk} instance.  Business modules interact with auth
 * exclusively through this client; they never resolve the service directly.
 */
export class AuthClientImpl implements IAuthClient {
  constructor(private readonly service: IAuthService) {}

  getCurrentUser(): UserContext | null {
    return this.service.getCurrentUser();
  }

  isAuthenticated(): boolean {
    return this.service.isAuthenticated();
  }

  async signIn(credentials: AuthCredentials): Promise<UserContext> {
    return this.service.signIn(credentials);
  }

  async signOut(): Promise<void> {
    return this.service.signOut();
  }

  async refreshSession(): Promise<UserContext> {
    return this.service.refreshSession();
  }

  getSessionInfo(): SessionInfo | null {
    return this.service.getSessionInfo();
  }
}
