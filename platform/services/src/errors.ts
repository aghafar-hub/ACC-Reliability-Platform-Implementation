// platform/services/src/errors.ts
// Error hierarchy for @acc-reliability/services.
//
// Each error carries a stable machine-readable `code` string so that
// callers can handle errors programmatically without string-matching on
// the message.  The code is passed up the constructor chain; no readonly
// fields are mutated after construction.
//
// Hierarchy:
//   PlatformError (kernel)
//     ├─ AuthError              AUTH_ERROR               — base for all auth failures
//     │    ├─ AuthenticationError  AUTH_UNAUTHENTICATED  — no active session / bad credentials
//     │    └─ SessionExpiredError  AUTH_SESSION_EXPIRED  — session has lapsed
//     └─ AuthorizationError     AUTHZ_ERROR              — base for all permission failures
//          └─ PermissionDeniedError  AUTHZ_PERMISSION_DENIED — action not permitted

import { PlatformError } from '@acc-reliability/kernel';

/**
 * Base error for all authentication and session failures.
 *
 * Catch this type to handle any auth-related error without needing to
 * enumerate sub-types.
 *
 * Sub-classes supply a more specific `code`; when this class is thrown
 * directly it uses `'AUTH_ERROR'`.
 */
export class AuthError extends PlatformError {
  constructor(
    message: string,
    code: string = 'AUTH_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message, code, context);
    this.name = 'AuthError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an operation requires an authenticated user but no active
 * session exists, or when supplied credentials are invalid.
 *
 * HTTP equivalent: 401 Unauthorized.
 */
export class AuthenticationError extends AuthError {
  constructor(
    message: string = 'Not authenticated',
    context?: Record<string, unknown>
  ) {
    super(message, 'AUTH_UNAUTHENTICATED', context);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the current session has expired and cannot be automatically
 * renewed.  The user must sign in again.
 *
 * HTTP equivalent: 401 Unauthorized (WWW-Authenticate: Bearer error="invalid_token").
 */
export class SessionExpiredError extends AuthError {
  constructor(context?: Record<string, unknown>) {
    super('Session has expired', 'AUTH_SESSION_EXPIRED', context);
    this.name = 'SessionExpiredError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ── Authorization errors ──────────────────────────────────────────────────────

/**
 * Base error for all authorization and permission failures.
 *
 * Catch this type to handle any authz-related error without needing to
 * enumerate sub-types.
 *
 * Sub-classes supply a more specific `code`; when this class is thrown
 * directly it uses `'AUTHZ_ERROR'`.
 */
export class AuthorizationError extends PlatformError {
  constructor(
    message: string,
    code: string = 'AUTHZ_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message, code, context);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an authenticated user attempts an operation they are not
 * permitted to perform.
 *
 * The caller should surface this as a permission-denied response and must
 * not reveal why the permission was denied (to avoid information leakage).
 *
 * HTTP equivalent: 403 Forbidden.
 */
export class PermissionDeniedError extends AuthorizationError {
  constructor(
    message: string = 'Permission denied',
    context?: Record<string, unknown>
  ) {
    super(message, 'AUTHZ_PERMISSION_DENIED', context);
    this.name = 'PermissionDeniedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
