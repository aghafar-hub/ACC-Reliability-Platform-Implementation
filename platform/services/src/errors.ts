// platform/services/src/errors.ts
// Error hierarchy for @acc-reliability/services.
//
// Each error carries a stable machine-readable `code` string so that
// callers can handle errors programmatically without string-matching on
// the message.  The code is passed up the constructor chain; no readonly
// fields are mutated after construction.
//
// Hierarchy:
//   PlatformError (kernel)
//     ├─ AuthError              AUTH_ERROR                  — base for all auth failures
//     │    ├─ AuthenticationError  AUTH_UNAUTHENTICATED     — no active session / bad credentials
//     │    └─ SessionExpiredError  AUTH_SESSION_EXPIRED     — session has lapsed
//     ├─ AuthorizationError     AUTHZ_ERROR                 — base for all permission failures
//     │    └─ PermissionDeniedError  AUTHZ_PERMISSION_DENIED — action not permitted
//     ├─ StorageError           STORAGE_ERROR               — base for all storage failures
//     │    ├─ ConnectionError      STORAGE_CONNECTION_ERROR — backend unreachable
//     │    ├─ QueryError           STORAGE_QUERY_ERROR      — invalid query / unsupported operator
//     │    ├─ EntityNotFoundError  STORAGE_NOT_FOUND        — requested entity does not exist
//     │    ├─ DuplicateEntityError STORAGE_DUPLICATE        — unique constraint violated
//     │    └─ TransactionError     STORAGE_TRANSACTION_ERROR — tx not supported or failed
//     ├─ HealthError            HEALTH_ERROR                — base for all health service failures
//     │    ├─ HealthCheckTimeoutError    HEALTH_CHECK_TIMEOUT     — check exceeded time limit
//     │    └─ HealthComponentNotFoundError HEALTH_COMPONENT_NOT_FOUND — unknown component id
//     ├─ MetricsError           METRICS_ERROR               — base for all metrics service failures
//     │    ├─ MetricNotFoundError          METRICS_NOT_FOUND          — unknown metric id
//     │    └─ MetricAlreadyRegisteredError METRICS_ALREADY_REGISTERED — duplicate registration
//     ├─ NotificationError      NOTIFICATION_ERROR          — base for all notification service failures
//     │    ├─ NotificationNotFoundError   NOTIFICATION_NOT_FOUND     — unknown notification id
//     │    └─ NotificationRecipientError  NOTIFICATION_RECIPIENT     — invalid or empty recipient list
//     └─ ActionError            ACTION_ERROR                — base for all action service failures
//          ├─ ActionNotFoundError       ACTION_NOT_FOUND           — unknown action id
//          ├─ ActionScopeError          ACTION_SCOPE_VIOLATION      — contractor scope mismatch on create
//          └─ ActionTransitionError     ACTION_INVALID_TRANSITION   — invalid status transition attempted

import { PlatformError } from '@acc-reliability/kernel';

/**
 * Base error for all authentication and session failures.
 *
 * Catch this type to handle any auth-related error without needing to
 * enumerate sub-types.
 *
 * Sub-classes supply a more specific `code`; when this class is thrown
 * directly it uses `'AUTH_ERROR'`.
 */
export class AuthError extends PlatformError {
  constructor(
    message: string,
    code: string = 'AUTH_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message, code, context);
    this.name = 'AuthError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an operation requires an authenticated user but no active
 * session exists, or when supplied credentials are invalid.
 *
 * HTTP equivalent: 401 Unauthorized.
 */
export class AuthenticationError extends AuthError {
  constructor(
    message: string = 'Not authenticated',
    context?: Record<string, unknown>
  ) {
    super(message, 'AUTH_UNAUTHENTICATED', context);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the current session has expired and cannot be automatically
 * renewed.  The user must sign in again.
 *
 * HTTP equivalent: 401 Unauthorized (WWW-Authenticate: Bearer error="invalid_token").
 */
export class SessionExpiredError extends AuthError {
  constructor(context?: Record<string, unknown>) {
    super('Session has expired', 'AUTH_SESSION_EXPIRED', context);
    this.name = 'SessionExpiredError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ── Authorization errors ──────────────────────────────────────────────────────

/**
 * Base error for all authorization and permission failures.
 *
 * Catch this type to handle any authz-related error without needing to
 * enumerate sub-types.
 *
 * Sub-classes supply a more specific `code`; when this class is thrown
 * directly it uses `'AUTHZ_ERROR'`.
 */
export class AuthorizationError extends PlatformError {
  constructor(
    message: string,
    code: string = 'AUTHZ_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message, code, context);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an authenticated user attempts an operation they are not
 * permitted to perform.
 *
 * The caller should surface this as a permission-denied response and must
 * not reveal why the permission was denied (to avoid information leakage).
 *
 * HTTP equivalent: 403 Forbidden.
 */
export class PermissionDeniedError extends AuthorizationError {
  constructor(
    message: string = 'Permission denied',
    context?: Record<string, unknown>
  ) {
    super(message, 'AUTHZ_PERMISSION_DENIED', context);
    this.name = 'PermissionDeniedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ── Storage errors ────────────────────────────────────────────────────────────

/**
 * Base error for all storage layer failures.
 *
 * Catch this type to handle any storage-related error without enumerating
 * sub-types.  Sub-classes supply a more specific `code`; when this class is
 * thrown directly it uses `'STORAGE_ERROR'`.
 */
export class StorageError extends PlatformError {
  constructor(
    message: string,
    code: string = 'STORAGE_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message, code, context);
    this.name = 'StorageError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the storage provider cannot establish or maintain a connection
 * to the backend (network failure, bad credentials, unreachable host, etc.).
 *
 * The platform should surface this as a service-unavailable condition and
 * trigger a health-check degradation.
 */
export class ConnectionError extends StorageError {
  constructor(
    message: string = 'Storage connection failed',
    context?: Record<string, unknown>
  ) {
    super(message, 'STORAGE_CONNECTION_ERROR', context);
    this.name = 'ConnectionError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a query cannot be executed because of an invalid
 * {@link QueryOptions} structure or an operator not supported by the
 * provider.
 *
 * Implementations must throw this rather than silently returning wrong
 * results when a filter operator is unsupported.
 */
export class QueryError extends StorageError {
  constructor(
    message: string = 'Query execution failed',
    context?: Record<string, unknown>
  ) {
    super(message, 'STORAGE_QUERY_ERROR', context);
    this.name = 'QueryError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an operation targets an entity that does not exist within the
 * contractor scope.
 *
 * HTTP equivalent: 404 Not Found.
 */
export class EntityNotFoundError extends StorageError {
  constructor(
    message: string = 'Entity not found',
    context?: Record<string, unknown>
  ) {
    super(message, 'STORAGE_NOT_FOUND', context);
    this.name = 'EntityNotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a `create` operation violates a unique constraint on the
 * storage backend.
 *
 * HTTP equivalent: 409 Conflict.
 */
export class DuplicateEntityError extends StorageError {
  constructor(
    message: string = 'Entity already exists',
    context?: Record<string, unknown>
  ) {
    super(message, 'STORAGE_DUPLICATE', context);
    this.name = 'DuplicateEntityError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a transactional operation fails or when a provider that does
 * not support transactions is asked to begin one.
 *
 * Google Sheets and similar providers must throw this from `beginTransaction`
 * to signal lack of native transaction support.
 */
export class TransactionError extends StorageError {
  constructor(
    message: string = 'Transaction failed',
    context?: Record<string, unknown>
  ) {
    super(message, 'STORAGE_TRANSACTION_ERROR', context);
    this.name = 'TransactionError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ── Health errors ─────────────────────────────────────────────────────────────

/**
 * Base error for all health service failures.
 *
 * Catch this type to handle any health-related error without enumerating
 * sub-types.  Sub-classes supply a more specific `code`; when this class is
 * thrown directly it uses `'HEALTH_ERROR'`.
 */
export class HealthError extends PlatformError {
  constructor(
    message: string,
    code: string = 'HEALTH_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message, code, context);
    this.name = 'HealthError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a health check function does not complete within its allowed
 * `timeoutMs`.  The component's status is recorded as `'offline'`.
 *
 * The `timeoutMs` field carries the limit that was exceeded.
 */
export class HealthCheckTimeoutError extends HealthError {
  readonly timeoutMs: number;

  constructor(componentId: string, timeoutMs: number) {
    super(
      `Health check for '${componentId}' timed out after ${timeoutMs}ms`,
      'HEALTH_CHECK_TIMEOUT',
      { componentId, timeoutMs },
    );
    this.name = 'HealthCheckTimeoutError';
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an operation targets a component that is not registered with
 * the health service.
 *
 * HTTP equivalent: 404 Not Found.
 */
export class HealthComponentNotFoundError extends HealthError {
  readonly componentId: string;

  constructor(componentId: string) {
    super(
      `Health component '${componentId}' is not registered`,
      'HEALTH_COMPONENT_NOT_FOUND',
      { componentId },
    );
    this.name = 'HealthComponentNotFoundError';
    this.componentId = componentId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ── Metrics errors ────────────────────────────────────────────────────────────

/**
 * Base error for all metrics service failures.
 *
 * Catch this type to handle any metrics-related error without enumerating
 * sub-types.  Sub-classes supply a more specific `code`; when this class is
 * thrown directly it uses `'METRICS_ERROR'`.
 */
export class MetricsError extends PlatformError {
  constructor(
    message: string,
    code: string = 'METRICS_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message, code, context);
    this.name = 'MetricsError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an operation (record, increment, set, timing, startTimer, reset)
 * targets a metric id that is not registered with the metrics service.
 *
 * HTTP equivalent: 404 Not Found.
 */
export class MetricNotFoundError extends MetricsError {
  readonly metricId: string;

  constructor(metricId: string) {
    super(
      `Metric '${metricId}' is not registered`,
      'METRICS_NOT_FOUND',
      { metricId },
    );
    this.name = 'MetricNotFoundError';
    this.metricId = metricId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when attempting to register a metric whose id is already registered.
 *
 * Unregister the existing metric first if a re-definition is intended.
 *
 * HTTP equivalent: 409 Conflict.
 */
export class MetricAlreadyRegisteredError extends MetricsError {
  readonly metricId: string;

  constructor(metricId: string) {
    super(
      `Metric '${metricId}' is already registered`,
      'METRICS_ALREADY_REGISTERED',
      { metricId },
    );
    this.name = 'MetricAlreadyRegisteredError';
    this.metricId = metricId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ── Notification errors ───────────────────────────────────────────────────────

/**
 * Base error for all notification service failures.
 *
 * Catch this type to handle any notification-related error without
 * enumerating sub-types.  Sub-classes supply a more specific `code`;
 * when this class is thrown directly it uses `'NOTIFICATION_ERROR'`.
 */
export class NotificationError extends PlatformError {
  constructor(
    message: string,
    code: string = 'NOTIFICATION_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message, code, context);
    this.name = 'NotificationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an operation targets a notification record whose id is not held
 * in the notification service (e.g. a `dismiss()` call with an unknown id).
 *
 * HTTP equivalent: 404 Not Found.
 */
export class NotificationNotFoundError extends NotificationError {
  readonly notificationId: string;

  constructor(notificationId: string) {
    super(
      `Notification '${notificationId}' was not found`,
      'NOTIFICATION_NOT_FOUND',
      { notificationId },
    );
    this.name = 'NotificationNotFoundError';
    this.notificationId = notificationId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a {@link NotificationRequest} contains an invalid or empty
 * recipient list.
 *
 * Every notification must target at least one recipient.  This error is
 * also thrown when recipient data is structurally invalid (e.g. missing
 * `contractorId`).
 *
 * HTTP equivalent: 400 Bad Request.
 */
export class NotificationRecipientError extends NotificationError {
  constructor(
    message: string = 'Notification request must include at least one valid recipient',
    context?: Record<string, unknown>
  ) {
    super(message, 'NOTIFICATION_RECIPIENT', context);
    this.name = 'NotificationRecipientError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ── Action errors ─────────────────────────────────────────────────────────────

/**
 * Base error for all action service failures.
 *
 * Catch this type to handle any action-related error without enumerating
 * sub-types.  Sub-classes supply a more specific `code`; when this class is
 * thrown directly it uses `'ACTION_ERROR'`.
 */
export class ActionError extends PlatformError {
  constructor(
    message: string,
    code: string = 'ACTION_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message, code, context);
    this.name = 'ActionError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an operation targets an action id that is not held in the
 * action service (e.g. `update()`, `assign()`, `start()`, etc. with an
 * unknown id).
 *
 * HTTP equivalent: 404 Not Found.
 */
export class ActionNotFoundError extends ActionError {
  readonly actionId: string;

  constructor(actionId: string) {
    super(
      `Action '${actionId}' was not found`,
      'ACTION_NOT_FOUND',
      { actionId },
    );
    this.name = 'ActionNotFoundError';
    this.actionId = actionId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a non-ACC contractor attempts to create an action outside their
 * own contractor scope.
 *
 * The `requestingContractorId` must equal the `contractorId` of the action
 * unless the requestor is `'ACC'`.
 *
 * HTTP equivalent: 403 Forbidden.
 */
export class ActionScopeError extends ActionError {
  readonly requestingContractorId: string;
  readonly targetContractorId: string;

  constructor(requestingContractorId: string, targetContractorId: string) {
    super(
      `Contractor '${requestingContractorId}' may not create actions in contractor '${targetContractorId}' scope`,
      'ACTION_SCOPE_VIOLATION',
      { requestingContractorId, targetContractorId },
    );
    this.name = 'ActionScopeError';
    this.requestingContractorId = requestingContractorId;
    this.targetContractorId = targetContractorId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a caller attempts a status transition that is not permitted
 * from the action's current status.
 *
 * Carries the action id, the status it was in (`fromStatus`), and the
 * status it was asked to transition to (`toStatus`).
 *
 * HTTP equivalent: 409 Conflict.
 */
export class ActionTransitionError extends ActionError {
  readonly actionId: string;
  readonly fromStatus: string;
  readonly toStatus: string;

  constructor(
    actionId: string,
    fromStatus: string,
    toStatus: string,
    detail?: string,
  ) {
    super(
      detail ??
        `Action '${actionId}' cannot transition from '${fromStatus}' to '${toStatus}'`,
      'ACTION_INVALID_TRANSITION',
      { actionId, fromStatus, toStatus },
    );
    this.name = 'ActionTransitionError';
    this.actionId = actionId;
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
