// platform/gateway/src/index.ts
// Public API surface for @acc-reliability/gateway.
//
// Only types and interfaces that middleware, route handlers, and business
// modules legitimately consume are exported here.

// ── Gateway core types ────────────────────────────────────────────────────────
export type {
  HttpMethod,
  ApiVersion,
  GatewayStatusCode,
  GatewayRequestMeta,
  GatewayRequest,
  GatewayResponseMeta,
  GatewayErrorPayload,
  GatewayResponse,
  GatewayContext,
} from './gateway-types';

export { API_VERSIONS } from './gateway-types';

// ── Gateway middleware ────────────────────────────────────────────────────────
export type {
  MiddlewareResult,
  IMiddleware,
  MiddlewareChain,
  MiddlewarePipelineResult,
} from './gateway-middleware';

// ── Gateway router ────────────────────────────────────────────────────────────
export type {
  RouteHandler,
  RouteDefinition,
  RouteMatch,
  IRouter,
} from './gateway-router';

// ── Gateway top-level ─────────────────────────────────────────────────────────
export type {
  GatewayServiceDependencies,
  GatewayConfig,
  GatewayStatus,
  IGateway,
} from './gateway';

// ── Gateway errors ────────────────────────────────────────────────────────────
export {
  GatewayError,
  RouteNotFoundError,
  GatewayAuthError,
  GatewayForbiddenError,
  GatewayValidationError,
  GatewayVersionError,
  GatewayMaintenanceError,
} from './gateway-errors';
