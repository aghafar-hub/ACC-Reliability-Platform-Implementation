// platform/sdk/src/impl/dev-auth-provider.ts
// Development-only IAuthProvider — accepts any non-empty credentials.
//
// PURPOSE: Provides a working sign-in flow during development and integration
// testing BEFORE a real identity backend (Microsoft Entra ID, OIDC, SAML) is
// connected.
//
// PRODUCTION WARNING: This provider performs NO real credential verification.
// It must be replaced by a real IAuthProvider before production deployment.
// Feature-flag or remove this provider when wiring a real identity backend.
//
// Credential interpretation:
//   PasswordCredentials — username treated as email; any non-empty password accepted.
//   TokenCredentials    — any non-empty token accepted; user parsed as "system".

import {
  AuthenticationError,
  createContractorId,
  createUserId,
  type AuthCredentials,
  type IAuthProvider,
  type UserContext,
} from '@acc-reliability/services';

/**
 * Development credential provider.
 *
 * Accepts any well-formed (non-empty) username and password.  The returned
 * user identity is derived from the username string:
 *
 *  - `userId`       → normalised username (trimmed)
 *  - `contractorId` → `'ACC'` (platform default)
 *  - `displayName`  → local-part of the email (before `@`)
 *  - `email`        → username as-is
 *  - `roles`        → `['platform.admin']` (full access for development)
 *
 * @remarks
 * This class must not be instantiated in production code paths.
 */
export class DevAuthProvider implements IAuthProvider {
  async validateCredentials(
    credentials: AuthCredentials,
  ): Promise<Omit<UserContext, 'sessionId' | 'authenticatedAt' | 'expiresAt'>> {
    if (credentials.kind === 'password') {
      const { username, password } = credentials;
      if (username.trim().length === 0 || password.trim().length === 0) {
        throw new AuthenticationError('Username and password are required');
      }

      const email       = username.trim();
      const displayName = email.includes('@') ? (email.split('@')[0] ?? email) : email;

      return {
        userId:       createUserId(email),
        contractorId: createContractorId('ACC'),
        displayName,
        email,
        roles:        ['platform.admin'],
      };
    }

    if (credentials.kind === 'token') {
      if (credentials.token.trim().length === 0) {
        throw new AuthenticationError('Token is required');
      }

      return {
        userId:       createUserId('system.token'),
        contractorId: createContractorId('ACC'),
        displayName:  'System (Token)',
        email:        'system@acc-reliability.platform',
        roles:        ['platform.admin'],
      };
    }

    throw new AuthenticationError(
      `Unsupported credential kind — expected 'password' or 'token'`,
    );
  }
}
