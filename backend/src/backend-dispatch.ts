// backend/src/backend-dispatch.ts
// Route dispatch contracts for the ACC Reliability Platform backend.
//
// The dispatch layer bridges client wire envelopes and the platform gateway:
//
//   BackendRequestEnvelope → IEnvelopeMapper → GatewayRequest
//   GatewayRequest → IGateway.handle → GatewayResponse
//   GatewayResponse → IResponseMapper → BackendResponseEnvelope
//
// IRouteDispatcher orchestrates this pipeline.  No implementation is provided
// in this milestone — concrete dispatchers are a future milestone once transport
// adapters and gateway implementations exist.
//
// Design decisions:
//   - Mappers are separate interfaces so envelope format changes do not require
//     gateway changes, and vice versa.
//   - IRouteDispatcher accepts BackendContext (not raw envelopes) so middleware
//     can enrich context before dispatch.
//   - All methods may return Promises to support async auth and gateway calls.

import type { BackendContext } from './backend-context';
import type {
  BackendRequestEnvelope,
  BackendResponseEnvelope,
} from './backend-envelope-types';
import type { GatewayRequest, GatewayResponse } from '@acc-reliability/gateway';

// ── IEnvelopeMapper ───────────────────────────────────────────────────────────

/**
 * Converts a client wire envelope into a gateway-internal request.
 *
 * Responsible for:
 *   - Validating required envelope fields (apiVersion, correlationId, timestamp)
 *   - Extracting HTTP method and path from the payload or envelope metadata
 *   - Populating GatewayRequestMeta (requestId, receivedAt)
 *   - Attaching parsed auth context when present
 */
export interface IEnvelopeMapper {
  toGatewayRequest(
    envelope: BackendRequestEnvelope<unknown>,
    context: BackendContext,
  ): GatewayRequest<unknown>;
}

// ── IResponseMapper ───────────────────────────────────────────────────────────

/**
 * Converts a gateway response into a client wire envelope.
 *
 * Responsible for:
 *   - Mapping GatewayResponse.success → BackendResponseEnvelope.success
 *   - Mapping GatewayErrorPayload → BackendErrorDetail
 *   - Echoing correlationId from the originating request
 *   - Setting serverTimestamp
 */
export interface IResponseMapper {
  toBackendResponse<TData>(
    response: GatewayResponse<TData>,
  ): BackendResponseEnvelope<TData>;
}

// ── IRouteDispatcher ──────────────────────────────────────────────────────────

/**
 * Orchestrates the full backend dispatch pipeline for a single request.
 *
 * Pipeline (008 §2, 402 §Gateway Responsibilities):
 *   1. Validate envelope structure
 *   2. Run auth/session middleware
 *   3. Run permission middleware (protected routes)
 *   4. Map envelope → GatewayRequest
 *   5. Invoke IGateway.handle()
 *   6. Map GatewayResponse → BackendResponseEnvelope
 *   7. Record audit entry (via gateway)
 *
 * Must not throw.  All errors are caught and returned as a structured
 * {@link BackendResponseEnvelope} with an appropriate status code.
 */
export interface IRouteDispatcher {
  /**
   * Processes a backend context through the full dispatch pipeline.
   *
   * Returns a client-facing response envelope.  Never throws.
   */
  dispatch(
    context: BackendContext,
  ): BackendResponseEnvelope<unknown> | Promise<BackendResponseEnvelope<unknown>>;
}
