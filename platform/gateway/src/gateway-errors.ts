// platform/gateway/src/gateway-errors.ts
// Error hierarchy for @acc-reliability/gateway.
//
// All gateway errors extend PlatformError from @acc-reliability/kernel so they
// carry a stable `code`, structured `context`, and a `timestamp`.
//
// Hierarchy:
//   PlatformError (kernel)
//     └─ GatewayError               GATEWAY_ERROR          — base for all gateway failures
//          ├─ RouteNotFoundError     GATEWAY_ROUTE_NOT_FOUND — no route matched path+method
//          ├─ GatewayAuthError       GATEWAY_AUTH_REQUIRED   — authentication required (401)
//          ├─ GatewayForbiddenError  GATEWAY_FORBIDDEN       — permission denied (403)
//          ├─ GatewayValidationError GATEWAY_VALIDATION      — invalid payload or query (400)
//          ├─ GatewayVersionError    GATEWAY_VERSION         — unsupported API version (400)
//          └─ GatewayMaintenanceError GATEWAY_MAINTENANCE    — platform in maintenance mode (503)

import { PlatformError } from '@acc-reliability/kernel';

/**
 * Base error for all API Gateway failures.
 *
 * Catch this type to handle any gateway-level error without enumerating
 * sub-types.  Sub-classes supply a more specific `code`; when this class is
 * thrown directly it uses `'GATEWAY_ERROR'`.
 */
export class GatewayError extends PlatformError {
  constructor(
    message: string,
    code: string = 'GATEWAY_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message, code, context);
    this.name = 'GatewayError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when no registered route matches the request method and path.
 *
 * HTTP equivalent: 404 Not Found.
 */
export class RouteNotFoundError extends GatewayError {
  readonly method: string;
  readonly path: string;

  constructor(method: string, path: string) {
    super(
      `No route found for ${method} ${path}`,
      'GATEWAY_ROUTE_NOT_FOUND',
      { method, path },
    );
    this.name = 'RouteNotFoundError';
    this.method = method;
    this.path = path;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a request targets an authenticated-only endpoint without a
 * valid session.
 *
 * HTTP equivalent: 401 Unauthorized.
 */
export class GatewayAuthError extends GatewayError {
  constructor(
    message: string = 'Authentication required',
    context?: Record<string, unknown>
  ) {
    super(message, 'GATEWAY_AUTH_REQUIRED', context);
    this.name = 'GatewayAuthError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an authenticated user does not hold the permission required
 * to invoke the requested route.
 *
 * HTTP equivalent: 403 Forbidden.
 */
export class GatewayForbiddenError extends GatewayError {
  constructor(
    message: string = 'Access denied',
    context?: Record<string, unknown>
  ) {
    super(message, 'GATEWAY_FORBIDDEN', context);
    this.name = 'GatewayForbiddenError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when request payload, path parameters, or query parameters fail
 * structural or business-rule validation before the route handler executes.
 *
 * `fields` carries a map of field name → validation message when applicable.
 *
 * HTTP equivalent: 400 Bad Request.
 */
export class GatewayValidationError extends GatewayError {
  readonly fields: Readonly<Record<string, string>>;

  constructor(
    message: string = 'Request validation failed',
    fields: Record<string, string> = {},
    context?: Record<string, unknown>
  ) {
    super(message, 'GATEWAY_VALIDATION', { ...context, fields });
    this.name = 'GatewayValidationError';
    this.fields = Object.freeze({ ...fields });
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the client declares an API version that the gateway does not
 * support.
 *
 * `requestedVersion` carries the version string from the incoming request.
 *
 * HTTP equivalent: 400 Bad Request.
 */
export class GatewayVersionError extends GatewayError {
  readonly requestedVersion: string;

  constructor(requestedVersion: string, supportedVersions: readonly string[]) {
    super(
      `API version '${requestedVersion}' is not supported`,
      'GATEWAY_VERSION',
      { requestedVersion, supportedVersions },
    );
    this.name = 'GatewayVersionError';
    this.requestedVersion = requestedVersion;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a request arrives while the platform is in maintenance mode.
 *
 * Non-critical write operations are blocked; read-only and health-check
 * endpoints may remain available depending on gateway configuration.
 *
 * HTTP equivalent: 503 Service Unavailable.
 */
export class GatewayMaintenanceError extends GatewayError {
  constructor(
    message: string = 'Platform is in maintenance mode',
    context?: Record<string, unknown>
  ) {
    super(message, 'GATEWAY_MAINTENANCE', context);
    this.name = 'GatewayMaintenanceError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
