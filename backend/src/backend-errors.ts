// backend/src/backend-errors.ts
// Error hierarchy for @acc-reliability/backend.
//
// All backend errors extend PlatformError from @acc-reliability/kernel.
//
// Hierarchy:
//   PlatformError (kernel)
//     └─ BackendError                    BACKEND_ERROR           — base for all backend failures
//          ├─ EnvelopeValidationError    BACKEND_ENVELOPE_INVALID — malformed wire envelope (400)
//          ├─ BackendAuthError            BACKEND_AUTH_REQUIRED    — session invalid (401)
//          └─ BackendDispatchError       BACKEND_DISPATCH_ERROR   — dispatch pipeline failure (500)

import { PlatformError } from '@acc-reliability/kernel';

/**
 * Base error for all backend layer failures.
 *
 * Catch this type to handle any backend-related error without enumerating
 * sub-types.  Sub-classes supply a more specific `code`; when this class is
 * thrown directly it uses `'BACKEND_ERROR'`.
 */
export class BackendError extends PlatformError {
  constructor(
    message: string,
    code: string = 'BACKEND_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message, code, context);
    this.name = 'BackendError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a client request envelope fails structural validation
 * (missing required fields, invalid apiVersion, malformed JSON).
 *
 * HTTP equivalent: 400 Bad Request (API-400).
 */
export class EnvelopeValidationError extends BackendError {
  readonly fields: Readonly<Record<string, string>>;

  constructor(
    message: string = 'Request envelope validation failed',
    fields: Record<string, string> = {},
    context?: Record<string, unknown>
  ) {
    super(message, 'BACKEND_ENVELOPE_INVALID', { ...context, fields });
    this.name = 'EnvelopeValidationError';
    this.fields = Object.freeze({ ...fields });
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a protected endpoint is accessed without a valid session or token.
 *
 * HTTP equivalent: 401 Unauthorized (API-401).
 */
export class BackendAuthError extends BackendError {
  constructor(
    message: string = 'Authentication required',
    context?: Record<string, unknown>
  ) {
    super(message, 'BACKEND_AUTH_REQUIRED', context);
    this.name = 'BackendAuthError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the dispatch pipeline encounters an unrecoverable internal error.
 *
 * HTTP equivalent: 500 Internal Platform Error (API-500).
 * Implementation details are never exposed to clients.
 */
export class BackendDispatchError extends BackendError {
  constructor(
    message: string = 'Backend dispatch failed',
    context?: Record<string, unknown>
  ) {
    super(message, 'BACKEND_DISPATCH_ERROR', context);
    this.name = 'BackendDispatchError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
