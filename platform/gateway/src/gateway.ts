// platform/gateway/src/gateway.ts
// Top-level IGateway interface and supporting configuration/status types.
//
// The gateway is the single controlled entry point for all client-to-platform
// communication (GATEWAY-001).  It owns the full request lifecycle:
//
//   receive → validate version → authenticate → authorise → check feature flags
//   → check maintenance mode → dispatch to route → record audit → respond
//
// Design decisions:
//   - IGateway.handle() is the only public entry point exposed to transport
//     adapters (doPost in Apps Script, HTTP handler in a Node server).
//   - registerRouter() scopes routes by module so the gateway can enforce
//     module isolation at the routing layer.
//   - GatewayConfig is intentionally minimal — it drives behaviour without
//     encoding business policy.  Feature flags and maintenance mode are
//     read from platform configuration at runtime.
//   - GatewayStatus is a lightweight read-only snapshot used by health checks.
//   - No implementation class in this file — the concrete gateway is a future
//     milestone once transport adapters are ready.

import type {
  IAuthService,
  IPermissionService,
  IAuditService,
  IHealthService,
  PlatformModule,
} from '@acc-reliability/services';
import type { ApiVersion, GatewayRequest, GatewayResponse } from './gateway-types';
import type { MiddlewareChain } from './gateway-middleware';
import type { IRouter } from './gateway-router';

// ── GatewayServiceDependencies ────────────────────────────────────────────────

/**
 * Platform services required by the gateway to perform its cross-cutting
 * responsibilities.
 *
 * All dependencies are injected as interfaces so the gateway remains
 * decoupled from concrete implementations and future provider swaps.
 */
export interface GatewayServiceDependencies {
  /** Used by the authentication middleware to validate sessions. */
  readonly auth: IAuthService;
  /** Used by the authorisation middleware to check route permissions. */
  readonly permissions: IPermissionService;
  /** Used to record an audit entry for every request that passes routing. */
  readonly audit: IAuditService;
  /** Used to surface gateway health state and update component status. */
  readonly health: IHealthService;
}

// ── GatewayConfig ─────────────────────────────────────────────────────────────

/**
 * Immutable configuration applied to the gateway at startup.
 *
 * Configuration controls behaviour without encoding business rules.  All
 * fields with defaults can be omitted from the initialisation config object.
 */
export interface GatewayConfig {
  /**
   * API versions that this gateway instance accepts.
   * Requests declaring any other version receive a 400 `GatewayVersionError`.
   */
  readonly apiVersions: readonly ApiVersion[];
  /** Version used when a request does not declare one explicitly. */
  readonly defaultApiVersion: ApiVersion;
  /**
   * When `true`, the gateway blocks all non-read, non-health-check requests
   * and returns `503 GatewayMaintenanceError`.
   * Default: `false`.
   */
  readonly maintenanceMode: boolean;
  /**
   * When `true`, every request must carry a valid authenticated session.
   * Routes can individually opt out of this requirement in future milestones.
   * Default: `true`.
   */
  readonly requireAuthentication: boolean;
  /**
   * Name of the HTTP header that carries the client-supplied correlation id.
   * Default: `'x-correlation-id'`.
   */
  readonly correlationIdHeader: string;
  /**
   * Name of the HTTP header that carries the requested API version.
   * Default: `'x-api-version'`.
   */
  readonly apiVersionHeader: string;
  /**
   * Maximum allowed request body size in bytes.
   * The gateway rejects payloads exceeding this limit with a 400 response.
   * Omit to apply no limit (not recommended for production).
   */
  readonly maxBodySizeBytes?: number;
  /**
   * Global middleware applied to every request before route-level middleware.
   * Sorted by `IMiddleware.order` before execution.
   */
  readonly globalMiddleware?: MiddlewareChain;
}

// ── GatewayStatus ─────────────────────────────────────────────────────────────

/**
 * Read-only health snapshot returned by {@link IGateway.getStatus}.
 *
 * Consumed by the health service and the App Owner control center.
 */
export interface GatewayStatus {
  /** `true` when the gateway is fully operational. */
  readonly healthy: boolean;
  /** `true` when maintenance mode is currently active. */
  readonly maintenanceMode: boolean;
  /** Total number of routes registered across all modules. */
  readonly registeredRoutes: number;
  /** Module ids that have registered at least one router. */
  readonly registeredModules: readonly PlatformModule[];
  /** API versions currently accepted by this gateway instance. */
  readonly activeApiVersions: readonly ApiVersion[];
}

// ── IGateway ──────────────────────────────────────────────────────────────────

/**
 * Platform API Gateway contract.
 *
 * The gateway is the single controlled entry point for all client communication
 * (GATEWAY-001, API-001).  Business modules must not expose backend endpoints
 * directly (GATEWAY-003); clients must never communicate directly with storage.
 *
 * Lifecycle:
 * 1. Construct with {@link GatewayServiceDependencies}.
 * 2. Call {@link configure} to apply {@link GatewayConfig}.
 * 3. Call {@link registerRouter} for each module that exposes routes.
 * 4. Call {@link handle} for every incoming request from the transport adapter.
 * 5. Call {@link getStatus} from the health service on health-check requests.
 *
 * Rules:
 * - `handle()` must never throw.  All errors are caught internally and
 *   returned as structured {@link GatewayResponse} objects.
 * - `handle()` always produces a response with a correlation id, even when
 *   the incoming request is malformed or fails version validation.
 * - Every request that reaches routing must produce an audit entry via
 *   the injected {@link IAuditService}.
 *
 * Service id reserved for registration: `platform.gateway`
 */
export interface IGateway {
  /**
   * Applies gateway configuration.
   *
   * Must be called before the first `handle()` invocation.
   * @throws {GatewayError} if called after the gateway has started handling requests.
   */
  configure(config: GatewayConfig): void;

  /**
   * Registers a module router with the gateway.
   *
   * All routes in the router become available for dispatch after registration.
   * Duplicate (method, path, apiVersion) combinations across all registered
   * routers are detected and rejected with a `GatewayError`.
   *
   * @throws {GatewayError} on duplicate route or unknown module id.
   */
  registerRouter(module: PlatformModule, router: IRouter): void;

  /**
   * Processes a single incoming request end-to-end.
   *
   * Executes the full pipeline:
   * version validation → authentication → authorisation → maintenance check
   * → global middleware → route middleware → route handler → audit recording.
   *
   * Never throws.  All errors are caught and mapped to a structured
   * {@link GatewayResponse} with an appropriate status code.
   */
  handle<TData = unknown>(
    request: GatewayRequest<unknown>,
  ): GatewayResponse<TData> | Promise<GatewayResponse<TData>>;

  /**
   * Returns a lightweight read-only snapshot of the gateway's current state.
   *
   * Used by the health service component registration and by the App Owner
   * control center dashboard.
   */
  getStatus(): GatewayStatus;
}
