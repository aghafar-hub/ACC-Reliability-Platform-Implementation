// platform/gateway/src/gateway-router.ts
// Route registration and resolution contracts for the Platform API Gateway.
//
// The router is the only component that maps (method, path, apiVersion) triples
// to handler functions.  Business modules register their routes through their
// module-level IRouter; the gateway aggregates all module routers into a single
// dispatch table.
//
// Design decisions:
//   - RouteHandler is typed as (request, context) → response | Promise<response>.
//     The body type TBody is narrowed at registration time; at dispatch time the
//     gateway casts the parsed body through the handler signature.
//   - RouteDefinition carries the owning module and API version so the gateway
//     can enforce isolation and version routing without inspecting the path.
//   - IRouter.match() returns null (not an error) when no route is found.  The
//     gateway converts a null match to RouteNotFoundError.
//   - path patterns use `:param` syntax for path parameters
//     (e.g. `/routes/:routeId`).  The router implementation resolves these to
//     the `params` map on the request.
//   - Route-level middleware supplements the global pipeline; it runs after
//     global middleware when both are present.

import type { PlatformModule } from '@acc-reliability/services';
import type {
  HttpMethod,
  ApiVersion,
  GatewayRequest,
  GatewayResponse,
  GatewayContext,
} from './gateway-types';
import type { MiddlewareChain } from './gateway-middleware';

// ── RouteHandler ──────────────────────────────────────────────────────────────

/**
 * Function invoked by the gateway when a request matches a registered route.
 *
 * `TBody` — the validated body shape expected by this handler.
 * `TData` — the shape of the `data` field in the success response.
 *
 * Handlers must not throw.  Any unhandled exception is caught by the gateway,
 * logged, and returned as a `500` response.
 */
export type RouteHandler<TBody = unknown, TData = unknown> = (
  request: GatewayRequest<TBody>,
  context: GatewayContext,
) => GatewayResponse<TData> | Promise<GatewayResponse<TData>>;

// ── RouteDefinition ───────────────────────────────────────────────────────────

/**
 * Immutable specification of a single gateway route.
 *
 * Registered by module-level routers and consumed by the gateway dispatcher.
 * The combination of `method + path + apiVersion` must be unique within a
 * module; duplicate registrations are rejected with an error.
 */
export interface RouteDefinition<TBody = unknown, TData = unknown> {
  /** HTTP method this route responds to. */
  readonly method: HttpMethod;
  /**
   * URL path pattern, relative to the API root.
   * Must begin with `/api/` followed by the module segment
   * (e.g. `/api/oil-lubrication/routes`, `/api/platform/users/:userId`).
   * Use `:paramName` tokens for path parameters.
   */
  readonly path: string;
  /** Platform module that owns this route. */
  readonly module: PlatformModule;
  /** API version this route is valid for. */
  readonly apiVersion: ApiVersion;
  /** Function invoked when the route matches. */
  readonly handler: RouteHandler<TBody, TData>;
  /**
   * Route-level middleware that supplements the global pipeline.
   * Executed after global middleware, in ascending `order`.
   */
  readonly middleware?: MiddlewareChain;
  /** Human-readable description for generated documentation and logging. */
  readonly description?: string;
}

// ── RouteMatch ────────────────────────────────────────────────────────────────

/**
 * Returned by {@link IRouter.match} when a route matches the incoming request.
 *
 * `params` contains path-parameter values extracted from the matched pattern
 * (e.g. for path `/routes/:routeId` and request `/routes/42`, params is
 * `{ routeId: '42' }`).
 */
export interface RouteMatch {
  /** The matched route definition. */
  readonly route: RouteDefinition;
  /**
   * Path parameter values extracted from the URL.
   * Empty object when the route pattern contains no parameters.
   */
  readonly params: Readonly<Record<string, string>>;
}

// ── IRouter ───────────────────────────────────────────────────────────────────

/**
 * Contract for a module-level route registry.
 *
 * Each business module creates one IRouter and registers all its routes on it.
 * The gateway aggregates module routers for dispatch.
 *
 * Rules:
 * - Registering the same (method, path, apiVersion) combination twice throws.
 * - `match()` never throws; it returns `null` when no route matches.
 * - `listRoutes()` returns a stable, frozen snapshot of all registered routes.
 */
export interface IRouter {
  /**
   * Registers a route with this router.
   *
   * @throws {GatewayError} if the route duplicates an existing (method, path,
   *   apiVersion) combination.
   */
  register<TBody, TData>(route: RouteDefinition<TBody, TData>): void;

  /**
   * Attempts to match an incoming request against registered routes.
   *
   * Returns a {@link RouteMatch} with extracted path parameters on success,
   * or `null` when no route matches.
   */
  match(method: HttpMethod, path: string, apiVersion: ApiVersion): RouteMatch | null;

  /**
   * Returns all routes currently registered with this router.
   *
   * The returned array is a frozen snapshot; mutating it has no effect on the
   * router's internal state.
   */
  listRoutes(): readonly RouteDefinition[];
}
