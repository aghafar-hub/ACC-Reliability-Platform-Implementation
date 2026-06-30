// platform/services/src/auth/auth-service.ts
// In-memory / repository-backed implementation of IAuthService.
//
// Design constraints:
//  - Credential validation is delegated to IAuthProvider (provider-independence).
//  - Session persistence is delegated to IAuthRepository (storage-independence).
//  - Audit events are recorded for every auth outcome; record() never throws.
//  - Expiration is evaluated lazily on every getCurrentUser / getSessionInfo call.
//  - This service never calls sessionStorage or any browser API directly.
//
// Service id (ServiceRegistry): `platform.auth`

import {
  AuthError,
  AuthenticationError,
  SessionExpiredError,
} from '../errors';
import {
  createSessionId,
  type AuthCredentials,
  type IAuthProvider,
  type IAuthRepository,
  type IAuthService,
  type SessionData,
  type SessionId,
  type SessionInfo,
  type UserContext,
} from './auth-types';
import type { IAuditService } from '../audit/audit-types';

// ── Session duration ──────────────────────────────────────────────────────────

/** Default session lifetime: 8 hours. */
const DEFAULT_SESSION_DURATION_MS = 8 * 60 * 60 * 1_000;

// ── AuthService ───────────────────────────────────────────────────────────────

/**
 * Platform authentication service.
 *
 * Orchestrates credential validation, session lifecycle, and audit recording.
 * All storage and provider concerns are injected — the service itself contains
 * no browser API calls or provider-specific logic.
 *
 * Construction:
 * ```ts
 * const service = new AuthService(repository, auditService, authProvider);
 * ```
 *
 * The service restores any existing session from the repository on construction.
 * If the stored session is already expired it is cleared and an audit record is
 * written immediately.
 */
export class AuthService implements IAuthService {
  private currentSession: SessionData | null = null;
  private readonly sessionDurationMs: number;

  constructor(
    private readonly repository: IAuthRepository,
    private readonly audit: IAuditService,
    private readonly provider: IAuthProvider,
    options?: { sessionDurationMs?: number },
  ) {
    this.sessionDurationMs = options?.sessionDurationMs ?? DEFAULT_SESSION_DURATION_MS;

    const stored = this.repository.load();
    if (stored === null) return;

    if (this.isExpiredData(stored)) {
      this.repository.clear();
      this.recordSessionExpired(stored);
    } else {
      this.currentSession = stored;
    }
  }

  // ── IAuthService ─────────────────────────────────────────────────────────────

  getCurrentUser(): UserContext | null {
    if (this.currentSession === null) return null;
    if (this.isExpiredNow()) {
      this.handleExpiry();
      return null;
    }
    return this.currentSession.userContext;
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  async signIn(credentials: AuthCredentials): Promise<UserContext> {
    const username = this.extractUsername(credentials);
    try {
      const identity = await this.provider.validateCredentials(credentials);

      const now = new Date().toISOString();
      const sessionId = this.generateSessionId();
      const expiresAt = new Date(Date.now() + this.sessionDurationMs).toISOString();

      const userContext: UserContext = {
        ...identity,
        sessionId,
        authenticatedAt: now,
        expiresAt,
      };

      const sessionData: SessionData = {
        userContext,
        sessionId,
        createdAt: now,
        lastActivityAt: now,
        expiresAt,
        rememberMe: false,
      };

      this.currentSession = sessionData;
      this.repository.save(sessionData);

      this.audit.record({
        category:    'auth',
        action:      'login',
        outcome:     'success',
        actor:       { userId: userContext.userId, contractorId: userContext.contractorId, sessionId },
        resource:    { module: 'platform', entityType: 'Session', entityId: sessionId as string },
        description: `User '${userContext.email}' signed in successfully`,
        severity:    'medium',
        reason:      'Successful credential validation',
        clientType:  'web-app',
      });

      return userContext;
    } catch (err) {
      this.audit.record({
        category:    'auth',
        action:      'login',
        outcome:     'failure',
        actor:       { userId: null, contractorId: null },
        resource:    { module: 'platform', entityType: 'Session' },
        description: `Sign-in attempt failed for '${username}'`,
        severity:    'high',
        reason:      err instanceof Error ? err.message : 'Unknown credential error',
        clientType:  'web-app',
      });

      if (err instanceof AuthError) throw err;
      throw new AuthenticationError('Sign-in failed — invalid credentials or service unavailable');
    }
  }

  async signOut(): Promise<void> {
    if (this.currentSession === null) return;

    const { userContext } = this.currentSession;

    this.audit.record({
      category:    'auth',
      action:      'logout',
      outcome:     'success',
      actor:       {
        userId:       userContext.userId,
        contractorId: userContext.contractorId,
        sessionId:    userContext.sessionId,
      },
      resource:    {
        module:     'platform',
        entityType: 'Session',
        entityId:   userContext.sessionId as string,
      },
      description: `User '${userContext.email}' signed out`,
      clientType:  'web-app',
    });

    this.currentSession = null;
    this.repository.clear();
  }

  async refreshSession(): Promise<UserContext> {
    if (this.currentSession === null) {
      throw new AuthenticationError('No active session to refresh — sign in first');
    }

    if (this.isExpiredNow()) {
      const expired = this.currentSession;
      this.handleExpiry();
      throw new SessionExpiredError({ sessionId: expired.sessionId });
    }

    const now = new Date().toISOString();
    const newExpiresAt = new Date(Date.now() + this.sessionDurationMs).toISOString();

    const refreshedUser: UserContext = {
      ...this.currentSession.userContext,
      expiresAt: newExpiresAt,
    };

    const refreshed: SessionData = {
      ...this.currentSession,
      userContext:      refreshedUser,
      lastActivityAt:   now,
      expiresAt:        newExpiresAt,
    };

    this.currentSession = refreshed;
    this.repository.save(refreshed);

    return refreshedUser;
  }

  getSessionInfo(): SessionInfo | null {
    if (this.currentSession === null) return null;
    if (this.isExpiredNow()) {
      this.handleExpiry();
      return null;
    }

    const s = this.currentSession;
    return {
      sessionId:      s.sessionId,
      userId:         s.userContext.userId,
      contractorId:   s.userContext.contractorId,
      createdAt:      s.createdAt,
      expiresAt:      s.expiresAt,
      lastActivityAt: s.lastActivityAt,
      isExpired:      false,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private isExpiredNow(): boolean {
    return this.currentSession !== null && this.isExpiredData(this.currentSession);
  }

  private isExpiredData(session: SessionData): boolean {
    return new Date(session.expiresAt).getTime() <= Date.now();
  }

  private handleExpiry(): void {
    if (this.currentSession === null) return;
    const expired = this.currentSession;
    this.currentSession = null;
    this.repository.clear();
    this.recordSessionExpired(expired);
  }

  private recordSessionExpired(session: SessionData): void {
    this.audit.record({
      category:    'auth',
      action:      'logout',
      outcome:     'failure',
      actor:       {
        userId:       session.userContext.userId,
        contractorId: session.userContext.contractorId,
        sessionId:    session.sessionId,
      },
      resource:    {
        module:     'platform',
        entityType: 'Session',
        entityId:   session.sessionId as string,
      },
      description: `Session '${session.sessionId}' expired for user '${session.userContext.email}'`,
      severity:    'medium',
      reason:      'Session lifetime exceeded',
      clientType:  'web-app',
    });
  }

  private generateSessionId(): SessionId {
    const ts  = Date.now().toString(36);
    const rnd = Math.random().toString(36).slice(2, 8);
    return createSessionId(`sess-${ts}-${rnd}`);
  }

  private extractUsername(credentials: AuthCredentials): string {
    if (credentials.kind === 'password') return credentials.username;
    return '<token>';
  }
}
