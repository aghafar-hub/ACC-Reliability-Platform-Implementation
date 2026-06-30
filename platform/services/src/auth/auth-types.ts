// platform/services/src/auth/auth-types.ts
// Authentication service interface and supporting value types for the ACC Reliability Platform.
//
// Design constraints:
//  - ContractorId is a branded type; contractor isolation is enforced at the type level.
//  - UserContext is an immutable snapshot — no methods, no mutable state.
//  - AuthCredentials is a discriminated union so new credential kinds extend without breaking callers.
//  - IAuthService exposes the minimum surface area needed by business modules.
//    Modules must never bypass this interface.

// ── Branded identity types ────────────────────────────────────────────────────

/**
 * Branded string representing a contractor identifier.
 * Contractor isolation is a first-class platform concern; this type prevents
 * accidental mixing of contractor-scoped data at compile time.
 *
 * Use {@link createContractorId} to produce values of this type.
 */
export type ContractorId = string & { readonly __brand: 'ContractorId' };

/**
 * Branded string representing a platform user identifier.
 * Unique within the entire platform, not scoped per contractor.
 */
export type UserId = string & { readonly __brand: 'UserId' };

/**
 * Branded string representing an authentication session identifier.
 */
export type SessionId = string & { readonly __brand: 'SessionId' };

// ── Contractor registry ───────────────────────────────────────────────────────

/**
 * Contractors currently supported by the platform.
 * New contractors are added here without requiring changes in business modules.
 */
export const KNOWN_CONTRACTORS = ['ACC', 'RHI', 'ASEC'] as const;

/** Union of currently known contractor identifier strings. */
export type KnownContractorCode = typeof KNOWN_CONTRACTORS[number];

// ── Branded-type factories ────────────────────────────────────────────────────

/**
 * Creates a {@link ContractorId} from a raw string.
 * Normalises to upper-case and rejects empty values.
 *
 * @throws {Error} if value is blank.
 */
export function createContractorId(value: string): ContractorId {
  const normalised = value.trim().toUpperCase();
  if (normalised.length === 0) {
    throw new Error('ContractorId cannot be empty');
  }
  return normalised as ContractorId;
}

/**
 * Creates a {@link UserId} from a raw string.
 * @throws {Error} if value is blank.
 */
export function createUserId(value: string): UserId {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error('UserId cannot be empty');
  }
  return trimmed as UserId;
}

/**
 * Creates a {@link SessionId} from a raw string.
 * @throws {Error} if value is blank.
 */
export function createSessionId(value: string): SessionId {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error('SessionId cannot be empty');
  }
  return trimmed as SessionId;
}

// ── User roles ────────────────────────────────────────────────────────────────

/**
 * Known platform roles.  The `string` extension keeps the type open for
 * future contractor-specific or module-specific roles without requiring a
 * platform-wide schema change.
 */
export type UserRole =
  | 'platform.admin'
  | 'platform.viewer'
  | 'contractor.admin'
  | 'contractor.engineer'
  | 'contractor.technician'
  | 'contractor.viewer'
  | (string & Record<never, never>);  // extensible; preserves autocomplete for known roles

// ── User context ──────────────────────────────────────────────────────────────

/**
 * Immutable snapshot of the currently authenticated user.
 *
 * This is the single authoritative source of user identity within the platform.
 * Every service and business module that needs "who is calling" receives a
 * `UserContext`.  The object is frozen at creation; mutation is prohibited.
 *
 * Lifecycle: created on sign-in, refreshed on session renewal, discarded on
 * sign-out or expiry.
 */
export interface UserContext {
  /** Unique platform user identifier. */
  readonly userId: UserId;
  /** Contractor the user belongs to.  Drives data isolation throughout the platform. */
  readonly contractorId: ContractorId;
  /** Human-readable display name (for UI and audit logs). */
  readonly displayName: string;
  /** Primary email address. */
  readonly email: string;
  /** Assigned roles.  Evaluated by the Authorization service (Milestone 4.2). */
  readonly roles: readonly UserRole[];
  /** Opaque session handle. */
  readonly sessionId: SessionId;
  /** ISO 8601 timestamp when authentication occurred. */
  readonly authenticatedAt: string;
  /** ISO 8601 timestamp when the session expires. */
  readonly expiresAt: string;
}

// ── Session info ──────────────────────────────────────────────────────────────

/**
 * Public metadata about the current session.  Contains no sensitive
 * credential material; safe to log and pass to diagnostic tools.
 */
export interface SessionInfo {
  readonly sessionId: SessionId;
  readonly userId: UserId;
  readonly contractorId: ContractorId;
  /** ISO 8601 timestamp when the session was created. */
  readonly createdAt: string;
  /** ISO 8601 timestamp when the session expires. */
  readonly expiresAt: string;
  /** ISO 8601 timestamp of the most recent activity that extended the session. */
  readonly lastActivityAt: string;
  /** `true` if the session expiry time has passed. */
  readonly isExpired: boolean;
}

// ── Auth credentials ──────────────────────────────────────────────────────────

/**
 * Credentials presented to {@link IAuthService.signIn}.
 *
 * Discriminated union — add new authentication mechanisms (OAuth, SAML, etc.)
 * without altering existing callers.
 */
export type AuthCredentials = PasswordCredentials | TokenCredentials;

/** Username + password credential pair. */
export interface PasswordCredentials {
  readonly kind: 'password';
  readonly username: string;
  readonly password: string;
}

/**
 * Pre-issued bearer token (e.g. service account, API token).
 * Validation is delegated to the IAuthService implementation.
 */
export interface TokenCredentials {
  readonly kind: 'token';
  readonly token: string;
}

// ── Session storage abstraction ───────────────────────────────────────────────

/**
 * Persisted session data written and read by {@link IAuthRepository}.
 *
 * All fields are plain serialisable values so the record survives a
 * JSON round-trip to sessionStorage or any other persistence backend.
 */
export interface SessionData {
  readonly userContext: UserContext;
  readonly sessionId: SessionId;
  readonly createdAt: string;
  readonly lastActivityAt: string;
  readonly expiresAt: string;
  /** When true the caller requested a persistent session (e.g. "remember me"). */
  readonly rememberMe: boolean;
}

/**
 * Abstract session persistence backing store.
 *
 * Implementations are free to use sessionStorage, localStorage, a server-side
 * cookie, or an in-memory map.  {@link AuthService} never calls a storage API
 * directly; it delegates entirely through this interface.
 */
export interface IAuthRepository {
  /** Persist a session, overwriting any previously stored session. */
  save(session: SessionData): void;
  /** Load the most recently saved session, or `null` when none exists. */
  load(): SessionData | null;
  /** Remove the stored session. */
  clear(): void;
}

// ── Credential validation abstraction ─────────────────────────────────────────

/**
 * Authentication provider contract — validates credentials and returns
 * the user identity they represent.
 *
 * Implementations wrap concrete identity backends (dev mock, Microsoft Entra
 * ID, OIDC, SAML, etc.).  {@link AuthService} delegates all credential
 * verification here; it never performs provider-specific validation itself.
 *
 * The returned context does **not** include `sessionId`, `authenticatedAt`,
 * or `expiresAt` — those are assigned by {@link AuthService} after a
 * successful validation.
 */
export interface IAuthProvider {
  /**
   * Validates the supplied credentials.
   *
   * @returns a partial {@link UserContext} (identity only, no session fields)
   *   when credentials are valid.
   * @throws {@link AuthenticationError} when credentials are invalid or the
   *   provider is unavailable.
   */
  validateCredentials(
    credentials: AuthCredentials,
  ): Promise<Omit<UserContext, 'sessionId' | 'authenticatedAt' | 'expiresAt'>>;
}

// ── IAuthService ──────────────────────────────────────────────────────────────

/**
 * Authentication service contract.
 *
 * Business modules consume this interface; they never depend on a concrete
 * implementation.  The implementation is resolved from the Service Registry
 * under the service id `platform.auth`.
 *
 * Thread model: all async methods are promise-based.  Implementations must
 * be safe to call from concurrent module initialisation.
 *
 * Future: when the Event Bus is active, sign-in and sign-out publish events
 * to `platform.events.auth.signed-in` and `platform.events.auth.signed-out`
 * respectively so subscribers can react without polling.
 */
export interface IAuthService {
  /**
   * Returns the {@link UserContext} of the currently signed-in user, or
   * `null` if no authenticated session is active.
   */
  getCurrentUser(): UserContext | null;

  /**
   * Returns `true` if there is a currently active, non-expired session.
   */
  isAuthenticated(): boolean;

  /**
   * Authenticates with the provided credentials and returns a {@link UserContext}.
   *
   * @throws {@link AuthenticationError} if credentials are invalid.
   * @throws {@link AuthError} for any other authentication failure.
   */
  signIn(credentials: AuthCredentials): Promise<UserContext>;

  /**
   * Terminates the current session.  Safe to call when no session is active
   * (no-op).
   */
  signOut(): Promise<void>;

  /**
   * Extends the current session and returns a refreshed {@link UserContext}
   * with updated `expiresAt`.
   *
   * @throws {@link SessionExpiredError} if the session has already expired
   *   and cannot be refreshed.
   * @throws {@link AuthenticationError} if there is no active session.
   */
  refreshSession(): Promise<UserContext>;

  /**
   * Returns {@link SessionInfo} for the current session, or `null` if no
   * session is active.
   */
  getSessionInfo(): SessionInfo | null;
}
