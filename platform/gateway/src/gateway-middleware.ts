// platform/gateway/src/gateway-middleware.ts
// Middleware pipeline contract for the Platform API Gateway.
//
// Middleware is the mechanism through which cross-cutting gateway concerns
// (authentication, authorisation, API-version validation, correlation-id
// injection, maintenance-mode enforcement, audit logging) are applied to
// every request without coupling them to individual route handlers.
//
// Design decisions:
//   - IMiddleware is an interface, not an abstract class.  Implementations
//     supply a `name` for logging and an `order` for pipeline sorting.
//   - execute() returns a MiddlewareResult, not void.  A middleware that
//     wishes to block the request returns { pass: false, response }.
//     A middleware that allows the request to continue returns { pass: true }.
//   - execute() may return a Promise to allow async middleware (e.g. one that
//     calls the auth service), but synchronous middleware should return a plain
//     MiddlewareResult to avoid unnecessary overhead.
//   - MiddlewareChain is an ordered, immutable list.  The gateway iterates it
//     in ascending `order` value; the first middleware that returns
//     { pass: false } short-circuits the remaining pipeline.
//   - MiddlewarePipelineResult records which middleware ran and which (if any)
//     blocked the request — used for structured logging and audit.

import type { GatewayContext } from './gateway-types';
import type { GatewayResponse } from './gateway-types';

// ── MiddlewareResult ──────────────────────────────────────────────────────────

/**
 * Value returned by {@link IMiddleware.execute}.
 *
 * When `pass` is `true`, the pipeline continues to the next middleware (or
 * the route handler if the middleware is last).
 *
 * When `pass` is `false`, `response` must be supplied.  The gateway returns
 * that response to the client and does not invoke any further pipeline stages.
 */
export type MiddlewareResult =
  | { readonly pass: true }
  | { readonly pass: false; readonly response: GatewayResponse<never> };

// ── IMiddleware ───────────────────────────────────────────────────────────────

/**
 * Contract for a single gateway middleware component.
 *
 * Middleware components are registered on the gateway or on individual routes.
 * Route-level middleware supplements (does not replace) gateway-level middleware.
 *
 * Ordering rules:
 * - Lower `order` values execute first.
 * - Two middleware with the same `order` are executed in registration order.
 * - Recommended order slots: 10=version, 20=auth, 30=permissions, 40=maintenance,
 *   50=audit, 60=metrics, 100+ = route-specific middleware.
 */
export interface IMiddleware {
  /** Display name used in logs and audit entries (e.g. `'AuthenticationMiddleware'`). */
  readonly name: string;
  /**
   * Execution order relative to other middleware in the same pipeline.
   * Lower values run first.
   */
  readonly order: number;
  /**
   * Processes the request context and decides whether to allow or block.
   *
   * Must not throw.  Any internal error should be caught and returned as a
   * `{ pass: false, response }` with an appropriate `500` status response,
   * or logged and forwarded as `{ pass: true }` if the middleware is non-critical.
   */
  execute(context: GatewayContext): MiddlewareResult | Promise<MiddlewareResult>;
}

// ── MiddlewareChain ───────────────────────────────────────────────────────────

/**
 * An ordered, immutable list of middleware components.
 *
 * The gateway sorts by `IMiddleware.order` before execution.  Route handlers
 * receive this as an optional addition to the global pipeline.
 */
export type MiddlewareChain = readonly IMiddleware[];

// ── MiddlewarePipelineResult ──────────────────────────────────────────────────

/**
 * Outcome of running the full middleware pipeline for a single request.
 *
 * Consumed by the gateway to decide whether to invoke the route handler and
 * by the structured logger / audit service to record what occurred.
 */
export interface MiddlewarePipelineResult {
  /** `true` if all middleware passed; `false` if any middleware blocked. */
  readonly passed: boolean;
  /** Names of middleware that executed, in execution order. */
  readonly executedMiddleware: readonly string[];
  /** Name of the middleware that blocked the request, if any. */
  readonly blockedBy?: string;
  /**
   * The blocking middleware's response, present when `passed` is `false`.
   * This is the response returned to the client.
   */
  readonly response?: GatewayResponse<never>;
}
