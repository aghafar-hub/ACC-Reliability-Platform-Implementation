// backend/src/backend-auth-middleware.ts
// Auth and permission middleware contracts for the ACC Reliability Platform backend.
//
// Conforms to:
//   - 101_AUTHENTICATION_SERVICE.md — session validation before business execution
//   - 103_PERMISSION_SERVICE.md — every backend operation shall validate permissions
//   - 008 §14 — security validation occurs before business execution
//
// Middleware runs after envelope parsing and before route dispatch.
// Implementations delegate to IAuthService and IPermissionService from
// @acc-reliability/services — no custom auth logic in the backend layer.
//
// Design decisions:
//   - AuthSessionResult and PermissionResult use discriminated unions so callers
//     can narrow without string matching.
//   - Middleware must not throw — failures are returned as { pass: false }.
//   - IPermissionMiddleware receives PermissionRequest from services so it
//     aligns with the platform permission model (module + action + contractor).

import type { BackendContext } from './backend-context';
import type {
  UserContext,
  PermissionRequest,
} from '@acc-reliability/services';

// ── AuthSessionResult ─────────────────────────────────────────────────────────

/**
 * Outcome of session validation by {@link IAuthSessionMiddleware}.
 *
 * When `pass` is `true`, `user` carries the authenticated {@link UserContext}.
 * When `pass` is `false`, `reason` describes why validation failed (for logging;
 * must not be exposed to clients verbatim).
 */
export type AuthSessionResult =
  | { readonly pass: true; readonly user: UserContext }
  | { readonly pass: false; readonly reason: string };

// ── PermissionResult ──────────────────────────────────────────────────────────

/**
 * Outcome of permission validation by {@link IPermissionMiddleware}.
 *
 * When `pass` is `true`, the user is authorised for the requested operation.
 * When `pass` is `false`, the operation is denied (403 — no information leakage
 * about whether the resource exists).
 */
export type PermissionResult =
  | { readonly pass: true }
  | { readonly pass: false; readonly reason: string };

// ── IAuthSessionMiddleware ────────────────────────────────────────────────────

/**
 * Validates the authentication context on a {@link BackendContext}.
 *
 * Per 101: no business module shall implement its own login system.
 * This middleware resolves the envelope auth context to a {@link UserContext}
 * via {@link IAuthService}.
 *
 * Ordering: runs before {@link IPermissionMiddleware} and before dispatch.
 * Must not throw.
 */
export interface IAuthSessionMiddleware {
  /** Display name for logging and audit (e.g. `'AuthSessionMiddleware'`). */
  readonly name: string;
  /**
   * Validates the session or token on the context.
   *
   * Returns `{ pass: true, user }` on success.
   * Returns `{ pass: false, reason }` when auth is missing or invalid.
   * Public endpoints (no auth on envelope) should return `{ pass: true }` with
   * a null-equivalent — implementations decide based on route metadata.
   */
  validateSession(context: BackendContext): AuthSessionResult | Promise<AuthSessionResult>;
}

// ── IPermissionMiddleware ─────────────────────────────────────────────────────

/**
 * Validates that the authenticated user may perform the requested operation.
 *
 * Per 103: every request shall pass through the Permission Service before
 * protected operations are executed.  UI permissions shall never replace
 * backend authorization (PERM-008).
 *
 * Runs after {@link IAuthSessionMiddleware} and before dispatch.
 * Must not throw.
 */
export interface IPermissionMiddleware {
  /** Display name for logging and audit (e.g. `'PermissionMiddleware'`). */
  readonly name: string;
  /**
   * Checks whether the user on the context holds the required permission.
   *
   * `request` carries module, action, and contractor scope per the platform
   * permission model.  Returns `{ pass: false }` (not an error) when denied.
   */
  authorize(
    context: BackendContext,
    user: UserContext,
    request: PermissionRequest,
  ): PermissionResult | Promise<PermissionResult>;
}
