// backend/src/backend-envelope-types.ts
// Client-facing wire envelopes for the ACC Reliability Platform backend.
//
// Conforms to 401_PLATFORM_API_STANDARD.md §6 (Request) and §7 (Response).
// These types describe the JSON shape clients send and receive.  The backend
// maps them to {@link GatewayRequest} / {@link GatewayResponse} before dispatch.
//
// Design decisions:
//   - BackendRequestEnvelope is generic over TPayload so route handlers can
//     narrow the payload after structural validation.
//   - BackendAuthContext is a discriminated union so new credential kinds
//     (OAuth, SAML) extend without breaking existing callers.
//   - All fields are readonly — envelopes are immutable value objects.
//   - No runtime validation in this file — validators are a future milestone.

import type { IsoTimestamp } from '@acc-reliability/shared-types';
import type { ApiVersion, GatewayStatusCode } from '@acc-reliability/gateway';
import type { CorrelationId, SessionId } from '@acc-reliability/services';

// ── BackendAuthContext ────────────────────────────────────────────────────────

/**
 * Token-based authentication context supplied by the client.
 * Maps to {@link TokenCredentials} in the auth service.
 */
export interface BackendTokenAuthContext {
  readonly kind: 'token';
  /** Bearer token or platform session token. */
  readonly token: string;
}

/**
 * Session-based authentication context supplied by the client.
 * The backend resolves the session via {@link IAuthService}.
 */
export interface BackendSessionAuthContext {
  readonly kind: 'session';
  /** Active platform session handle. */
  readonly sessionId: SessionId;
}

/**
 * Authentication context carried on every authenticated request envelope.
 *
 * Per 401 §6: every request shall include an authentication context when
 * accessing protected resources.  Public endpoints omit this field.
 */
export type BackendAuthContext =
  | BackendTokenAuthContext
  | BackendSessionAuthContext;

// ── BackendRequestEnvelope ────────────────────────────────────────────────────

/**
 * Client-facing request envelope (401 §6).
 *
 * Required fields on every request:
 *   - apiVersion
 *   - correlationId
 *   - timestamp
 *   - payload (may be null for bodyless operations)
 *
 * Optional:
 *   - auth — required for protected endpoints; omitted for public routes
 */
export interface BackendRequestEnvelope<TPayload = unknown> {
  /** API version declared by the client (e.g. `'v1'`). */
  readonly apiVersion: ApiVersion;
  /**
   * Correlation token linking this request to all related messages and events.
   * Client-generated when available; backend-generated otherwise.
   */
  readonly correlationId: CorrelationId;
  /** UTC timestamp when the client constructed the request (ISO 8601). */
  readonly timestamp: IsoTimestamp;
  /** Authentication context; omitted for public endpoints. */
  readonly auth?: BackendAuthContext;
  /**
   * Business payload.  `null` for operations that carry no body.
   * The backend validates structure before passing to route handlers.
   */
  readonly payload: TPayload | null;
}

// ── BackendErrorDetail ────────────────────────────────────────────────────────

/**
 * Structured error detail included in non-success response envelopes.
 *
 * Maps to platform API standard error codes (401 §8):
 * API-400, API-401, API-403, API-404, API-409, API-500.
 * Implementation details are never exposed here.
 */
export interface BackendErrorDetail {
  /** Machine-readable error code (e.g. `'API-401'`, `'AUTH_UNAUTHENTICATED'`). */
  readonly code: string;
  /** Human-readable message safe to display in a client UI. */
  readonly message: string;
  /** Field-level validation errors (field name → message). */
  readonly details?: Readonly<Record<string, string>>;
}

// ── BackendResponseEnvelope ───────────────────────────────────────────────────

/**
 * Client-facing response envelope (401 §7).
 *
 * Required fields on every response:
 *   - success
 *   - status
 *   - correlationId
 *   - serverTimestamp
 *
 * Present on success: result
 * Present on failure: error
 */
export interface BackendResponseEnvelope<TData = unknown> {
  /** `true` when the operation completed successfully. */
  readonly success: boolean;
  /** HTTP-equivalent status code. */
  readonly status: GatewayStatusCode;
  /** Business result present on success responses. */
  readonly result?: TData;
  /** Error detail present on non-success responses. */
  readonly error?: BackendErrorDetail;
  /** Echo of the originating request correlation id. */
  readonly correlationId: CorrelationId;
  /** UTC timestamp when the backend produced this response (ISO 8601). */
  readonly serverTimestamp: IsoTimestamp;
}
