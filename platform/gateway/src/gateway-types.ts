// platform/gateway/src/gateway-types.ts
// Core request, response, and context types for the Platform API Gateway.
//
// Every interaction between a client and the platform passes through these
// types.  They are transport-independent: the same contract covers both the
// Google Apps Script doPost() handler and any future HTTP server adapter.
//
// Design decisions:
//   - GatewayRequest<TBody> is generic so route handlers receive a typed body
//     without casting.  In contexts where the body type is unknown (middleware,
//     router), use GatewayRequest<unknown>.
//   - GatewayResponse<TData> follows the platform API standard: every response
//     carries success flag, status code, correlation id, and server timestamp.
//   - GatewayContext is the shared carrier threaded through middleware and
//     route handlers.  It is created once per request and never mutated.
//   - All fields are readonly — the gateway processes requests immutably.
//   - HttpMethod uses a known-value union with an open string escape hatch for
//     future extension without breaking existing handlers.

import type { IsoTimestamp } from '@acc-reliability/shared-types';
import type {
  CorrelationId,
  RequestId,
  UserContext,
  ContractorId,
  PlatformModule,
} from '@acc-reliability/services';

// ── HttpMethod ────────────────────────────────────────────────────────────────

/** HTTP methods recognised by the gateway router. */
export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS';

// ── ApiVersion ────────────────────────────────────────────────────────────────

/**
 * API version token carried on every request.
 *
 * `'v1'` is the initial version.  Breaking changes require a new version
 * token; minor additions remain backward-compatible within the same version.
 */
export type ApiVersion = 'v1' | (string & Record<never, never>);

/** Known API versions that the gateway currently supports. */
export const API_VERSIONS = ['v1'] as const;

// ── GatewayStatusCode ─────────────────────────────────────────────────────────

/**
 * HTTP status codes produced by the gateway.
 *
 * Maps directly to the platform API standard error codes defined in
 * 401_PLATFORM_API_STANDARD.md §8.
 */
export type GatewayStatusCode =
  | 200  // OK — request succeeded
  | 201  // Created — resource created
  | 204  // No Content — success with empty body
  | 400  // Bad Request — invalid payload or API version
  | 401  // Unauthorized — authentication required
  | 403  // Forbidden — authenticated but not permitted
  | 404  // Not Found — route or resource does not exist
  | 409  // Conflict — business rule or uniqueness violation
  | 422  // Unprocessable Entity — structurally valid but business-invalid
  | 500  // Internal Error — unhandled platform error
  | 503; // Service Unavailable — maintenance mode or backend down

// ── GatewayRequestMeta ────────────────────────────────────────────────────────

/**
 * Routing and tracing metadata attached to every incoming request.
 *
 * The gateway generates or validates these fields before invoking
 * any middleware or route handler.
 */
export interface GatewayRequestMeta {
  /** Unique identifier for this specific request (gateway-assigned). */
  readonly requestId: RequestId;
  /**
   * Correlation token shared across all messages produced by the same
   * user-initiated action.  Sourced from the incoming header when present;
   * gateway-generated otherwise.
   */
  readonly correlationId: CorrelationId;
  /** API version declared by the client. */
  readonly apiVersion: ApiVersion;
  /** UTC timestamp when the gateway received the request. */
  readonly receivedAt: IsoTimestamp;
  /** Client IP address when available (may be absent in Apps Script context). */
  readonly ipAddress?: string;
  /** User-Agent header value when present. */
  readonly userAgent?: string;
}

// ── GatewayRequest ────────────────────────────────────────────────────────────

/**
 * Immutable representation of an incoming platform request.
 *
 * `TBody` defaults to `unknown`; route handlers narrow it to their expected
 * payload shape after validation.  Middleware operates on `GatewayRequest<unknown>`.
 */
export interface GatewayRequest<TBody = unknown> {
  /** Routing and tracing metadata. */
  readonly meta: GatewayRequestMeta;
  /** HTTP method of the request. */
  readonly method: HttpMethod;
  /**
   * Normalised path without query string (e.g. `/api/v1/oil-lubrication/routes`).
   * Always lowercase and leading-slash-prefixed.
   */
  readonly path: string;
  /** Path parameter values extracted by the router (e.g. `{ id: '42' }`). */
  readonly params: Readonly<Record<string, string>>;
  /** Query string parameters as a flat string map. */
  readonly query: Readonly<Record<string, string>>;
  /** Normalised lowercase request headers. */
  readonly headers: Readonly<Record<string, string>>;
  /**
   * Parsed request body.  `null` for requests without a body (GET, DELETE).
   * The gateway passes the raw parsed body; route handlers must validate the
   * shape before use.
   */
  readonly body: TBody | null;
  /**
   * Authenticated user context, populated by the authentication middleware.
   * `null` when the request has not been authenticated (public endpoints or
   * failed authentication).
   */
  readonly user: UserContext | null;
  /**
   * Contractor boundary resolved from the authenticated user.
   * `null` when the request is unauthenticated.
   */
  readonly contractorId: ContractorId | null;
}

// ── GatewayResponseMeta ───────────────────────────────────────────────────────

/**
 * Tracing metadata attached to every outgoing response.
 */
export interface GatewayResponseMeta {
  /** Echo of the originating request id for correlation on the client side. */
  readonly requestId: RequestId;
  /** Correlation token to link this response to the originating request. */
  readonly correlationId: CorrelationId;
  /** UTC timestamp when the response was produced. */
  readonly respondedAt: IsoTimestamp;
  /** End-to-end processing time in milliseconds. */
  readonly durationMs: number;
}

// ── GatewayErrorPayload ───────────────────────────────────────────────────────

/**
 * Structured error payload included in non-success responses.
 *
 * Implementation details (stack traces, internal IDs) are never exposed here.
 * The `code` is the machine-readable error code from the platform error hierarchy.
 */
export interface GatewayErrorPayload {
  /** Machine-readable error code (e.g. `'API-400'`, `'AUTH_UNAUTHENTICATED'`). */
  readonly code: string;
  /** Human-readable error message safe to display in a client UI. */
  readonly message: string;
  /** Structured detail map for validation errors (field → message). */
  readonly details?: Record<string, string>;
}

// ── GatewayResponse ───────────────────────────────────────────────────────────

/**
 * Immutable response envelope returned by every route handler and middleware.
 *
 * Conforms to the platform API response standard (401_PLATFORM_API_STANDARD §7):
 * every response carries success flag, status code, correlation id, and timestamp.
 *
 * `TData` defaults to `unknown`.  Callers that need typed data narrow via the
 * `data` field after checking `success === true`.
 */
export interface GatewayResponse<TData = unknown> {
  /** Response routing and timing metadata. */
  readonly meta: GatewayResponseMeta;
  /** HTTP status code produced by the gateway or route handler. */
  readonly status: GatewayStatusCode;
  /** `true` when the operation completed successfully (`2xx` status). */
  readonly success: boolean;
  /** Business payload present on success responses. */
  readonly data?: TData;
  /** Error detail present on non-success responses. */
  readonly error?: GatewayErrorPayload;
}

// ── GatewayContext ────────────────────────────────────────────────────────────

/**
 * Shared carrier threaded through the middleware pipeline and into route handlers.
 *
 * Created once per request by the gateway and passed immutably through every
 * processing stage.  Handlers must not mutate this object; they communicate
 * results through the returned {@link GatewayResponse}.
 */
export interface GatewayContext {
  /** The incoming request (body typed as unknown at this level). */
  readonly request: GatewayRequest<unknown>;
  /** UTC timestamp when the gateway began processing this request. */
  readonly startedAt: IsoTimestamp;
  /**
   * Platform module inferred from the request path, if determinable at
   * context-creation time.  `null` for platform-level routes (e.g. health check).
   */
  readonly module: PlatformModule | null;
}
