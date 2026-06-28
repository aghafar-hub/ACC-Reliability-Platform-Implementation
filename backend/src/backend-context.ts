// backend/src/backend-context.ts
// Runtime context for the ACC Reliability Platform backend layer.
//
// BackendContext is distinct from GatewayContext:
//   - BackendContext owns the wire envelope and runtime metadata.
//   - GatewayContext owns the dispatch pipeline state.
//
// The backend creates a BackendContext when it receives a request envelope
// (or a GAS doPost event).  Envelope mappers and the route dispatcher consume
// this object; they may derive a GatewayContext from it when calling IGateway.
//
// Design decisions:
//   - gatewayContext is optional — populated after envelope mapping, not at
//     envelope-parse time.
//   - sessionToken is extracted from auth context for convenience; middleware
//     resolves it to a UserContext via IAuthService.
//   - All fields are readonly.

import type { BackendRequestEnvelope } from './backend-envelope-types';
import type { GatewayContext } from '@acc-reliability/gateway';

// ── BackendRuntimeKind ────────────────────────────────────────────────────────

/**
 * Identifies the backend runtime environment processing the request.
 *
 * `'gas'` is the approved current runtime (008 §v3.0).
 * Additional values may be registered for future migration targets.
 */
export type BackendRuntimeKind = 'gas' | (string & Record<never, never>);

// ── BackendContext ────────────────────────────────────────────────────────────

/**
 * Shared carrier for a single backend request lifecycle.
 *
 * Created once when the backend receives a request.  Passed immutably through
 * envelope validation, auth middleware, permission middleware, and dispatch.
 * Handlers communicate results via {@link BackendResponseEnvelope}, not by
 * mutating this object.
 */
export interface BackendContext {
  /** The parsed client request envelope. */
  readonly envelope: BackendRequestEnvelope<unknown>;
  /** Runtime environment processing this request. */
  readonly runtime: BackendRuntimeKind;
  /**
   * Raw session or bearer token extracted from {@link BackendAuthContext}.
   * `null` when the envelope carries no auth context (public endpoint).
   */
  readonly sessionToken: string | null;
  /**
   * Gateway dispatch context, populated after envelope mapping.
   * `null` until the mapper has converted the envelope to a GatewayRequest.
   */
  readonly gatewayContext: GatewayContext | null;
}
