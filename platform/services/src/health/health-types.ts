// platform/services/src/health/health-types.ts
// Health Service contracts for the ACC Reliability Platform.
//
// Defines what modules report (HealthCheckOutcome), what the service records
// (HealthCheckResult, HealthComponentStatus), and what callers query (HealthSummary).
//
// Design rules:
//  - IHealthService is the sole interface business modules consume.
//  - HealthCheckFn is the only dependency a component must fulfil to participate.
//  - All public data shapes are immutable DTOs — no methods, no mutable state.
//  - The implementation (HealthService) is resolved from the Service Registry
//    under the service id `platform.health`.

// ── Health states ─────────────────────────────────────────────────────────────

/**
 * Operational health status of a platform component.
 *
 * Severity order (worst → best):
 *   offline > critical > degraded > warning > maintenance > healthy
 *
 * `offline`      — component is unreachable or its health check could not run.
 * `critical`     — component is running but in an unacceptable state; immediate action required.
 * `degraded`     — component is running with reduced capability; intervention needed soon.
 * `warning`      — component is running normally but a condition warrants attention.
 * `maintenance`  — component is intentionally paused; not a failure state.
 * `healthy`      — component is fully operational within expected parameters.
 */
export type HealthStatus =
  | 'healthy'
  | 'warning'
  | 'degraded'
  | 'critical'
  | 'offline'
  | 'maintenance';

// ── Component categories ──────────────────────────────────────────────────────

/**
 * Ordered tuple of built-in component categories.
 * Covers all platform layers that can register health checks.
 */
export const HEALTH_CATEGORIES = [
  'kernel',
  'service',
  'storage',
  'module',
  'communication',
] as const;

/** Union of built-in component category identifiers. */
export type KnownHealthCategory = typeof HEALTH_CATEGORIES[number];

/**
 * Category of a health-monitored component.
 *
 * The open-union extension allows future platform layers or external integrations
 * to register health checks without a platform schema change.
 */
export type HealthComponentCategory = KnownHealthCategory | (string & Record<never, never>);

// ── Check function contract ───────────────────────────────────────────────────

/**
 * The data a health check function must return.
 *
 * The function is only responsible for the health determination (status, message,
 * optional details).  Timing, metadata, and timeout handling are managed by
 * {@link IHealthService}.
 */
export interface HealthCheckOutcome {
  /** Assessed health status of the component at the time of the check. */
  readonly status: HealthStatus;
  /** Human-readable message describing the current condition. */
  readonly message?: string;
  /** Optional structured diagnostic data (safe to log; no secrets). */
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Function that a component provides to report its own health.
 *
 * Must not throw — unhandled exceptions are caught by {@link IHealthService}
 * and recorded as `offline`.  Long-running checks are subject to the
 * per-registration `timeoutMs` limit.
 */
export type HealthCheckFn = () => Promise<HealthCheckOutcome> | HealthCheckOutcome;

// ── Registration ──────────────────────────────────────────────────────────────

/**
 * Descriptor used when registering a component with the health service.
 *
 * Each `componentId` must be unique within the health service.
 * Recommended format: `<layer>.<name>` — e.g. `platform.kernel`, `module.oil-lubrication`.
 */
export interface HealthComponentRegistration {
  /** Unique component identifier. */
  readonly componentId: string;
  /** Human-readable display name (for logs and diagnostics). */
  readonly componentName: string;
  /** Platform layer this component belongs to. */
  readonly category: HealthComponentCategory;
  /** Health check function invoked by {@link IHealthService.check}. */
  readonly check: HealthCheckFn;
  /**
   * Maximum milliseconds the check may run before it is declared `offline`.
   * Defaults to {@link DEFAULT_HEALTH_CHECK_TIMEOUT_MS} when omitted.
   */
  readonly timeoutMs?: number;
}

/** Default timeout (ms) applied to every health check that does not specify its own. */
export const DEFAULT_HEALTH_CHECK_TIMEOUT_MS = 5_000;

// ── Check result ──────────────────────────────────────────────────────────────

/**
 * Immutable record produced by the health service after running a single check.
 *
 * Created by {@link IHealthService.check} and {@link IHealthService.checkAll}.
 * It combines the component's own {@link HealthCheckOutcome} with timing metadata
 * managed by the service.
 */
export interface HealthCheckResult {
  /** Component that was checked. */
  readonly componentId: string;
  /** Human-readable component name. */
  readonly componentName: string;
  /** Category of the component. */
  readonly category: HealthComponentCategory;
  /** Health status reported (or `'offline'` if the check threw or timed out). */
  readonly status: HealthStatus;
  /** ISO 8601 UTC timestamp when the check started. */
  readonly checkedAt: string;
  /** Wall-clock duration of the check in milliseconds. */
  readonly durationMs: number;
  /** `true` if the check was aborted because it exceeded `timeoutMs`. */
  readonly timedOut: boolean;
  /** Message from the check function, or an error description if the check failed. */
  readonly message?: string;
  /** Structured diagnostics from the check function. */
  readonly details?: Readonly<Record<string, unknown>>;
  /** Error message when the check threw an exception (implies `status === 'offline'`). */
  readonly error?: string;
}

// ── Component status ──────────────────────────────────────────────────────────

/**
 * Current health state of a registered component as maintained by the service.
 *
 * This is a live snapshot derived from the most recent {@link HealthCheckResult}
 * for each component.  Components that have never been checked report
 * `status: 'offline'` and `null` timing fields.
 */
export interface HealthComponentStatus {
  /** Component identifier. */
  readonly componentId: string;
  /** Human-readable component name. */
  readonly componentName: string;
  /** Category of the component. */
  readonly category: HealthComponentCategory;
  /** Most recently determined health status. */
  readonly status: HealthStatus;
  /** ISO 8601 UTC timestamp of the most recent check, or `null` if never checked. */
  readonly lastCheckedAt: string | null;
  /** Duration of the most recent check in ms, or `null` if never checked. */
  readonly lastCheckDurationMs: number | null;
  /** Message from the most recent check, if any. */
  readonly lastMessage?: string;
  /** ISO 8601 UTC timestamp when this component was registered. */
  readonly registeredAt: string;
  /** Total number of times this component has been checked. */
  readonly checkCount: number;
  /** Number of consecutive checks that returned a non-healthy status. */
  readonly consecutiveFailures: number;
}

// ── Health summary ────────────────────────────────────────────────────────────

/**
 * Platform-wide health snapshot returned by {@link IHealthService.getSummary}.
 *
 * The `overallStatus` is the worst status across all non-maintenance components.
 * If all components are in `maintenance`, the overall status is `maintenance`.
 * If no components are registered, the overall status is `healthy`.
 */
export interface HealthSummary {
  /** Worst-case status across all registered components (see rules above). */
  readonly overallStatus: HealthStatus;
  /** ISO 8601 UTC timestamp when this summary was computed. */
  readonly timestamp: string;
  /** Status snapshot for each registered component. */
  readonly components: readonly HealthComponentStatus[];
  /** Total number of registered components. */
  readonly totalComponents: number;
  /** Number of components in `healthy` state. */
  readonly healthyCount: number;
  /** Number of components in `warning` state. */
  readonly warningCount: number;
  /** Number of components in `degraded` state. */
  readonly degradedCount: number;
  /** Number of components in `critical` state. */
  readonly criticalCount: number;
  /** Number of components in `offline` state. */
  readonly offlineCount: number;
  /** Number of components in `maintenance` state. */
  readonly maintenanceCount: number;
}

// ── Service options ───────────────────────────────────────────────────────────

/** Configuration options for {@link HealthService}. */
export interface HealthServiceOptions {
  /**
   * Default timeout in milliseconds applied to checks that do not set their own.
   * @default DEFAULT_HEALTH_CHECK_TIMEOUT_MS
   */
  readonly defaultTimeoutMs?: number;
}

// ── IHealthService ────────────────────────────────────────────────────────────

/**
 * Health service contract.
 *
 * Business modules consume this interface to register their own health check
 * functions and to query platform health state.  The implementation is resolved
 * from the Service Registry under the service id `platform.health`.
 *
 * Usage pattern:
 *  1. On module startup: call `register()` with a check function.
 *  2. On module shutdown: call `unregister()` to remove the component.
 *  3. Diagnostics: call `getSummary()` or `check()` on demand.
 *
 * Future: when Phase 9 (Event Bus) is active, the health service will publish
 * `HealthStatusChangedEvent` whenever a component's status changes.
 * Callers of `IHealthService` need no changes.
 */
export interface IHealthService {
  /**
   * Registers a component and its health check function.
   *
   * @throws {HealthError} if a component with the same `componentId` is already registered.
   */
  register(registration: HealthComponentRegistration): void;

  /**
   * Removes a component from the health registry.
   * No-op if the component is not registered.
   */
  unregister(componentId: string): void;

  /**
   * Runs the health check for a single component and returns the result.
   *
   * Always executes the check fresh — does not return cached data.
   * Exceptions and timeouts are caught and returned as `status: 'offline'`.
   *
   * @throws {HealthComponentNotFoundError} if the component is not registered.
   */
  check(componentId: string): Promise<HealthCheckResult>;

  /**
   * Runs all registered health checks in parallel and returns every result.
   *
   * Individual check failures do not abort the others.
   * Returns an empty array if no components are registered.
   */
  checkAll(): Promise<readonly HealthCheckResult[]>;

  /**
   * Returns the most recent {@link HealthComponentStatus} for a single component.
   *
   * Returns `null` if the component is not registered.
   * Returns a status with `status: 'offline'` and `null` timing fields if the
   * component has never been checked.
   */
  getStatus(componentId: string): HealthComponentStatus | null;

  /**
   * Returns a platform-wide {@link HealthSummary} computed from the most recent
   * known status of every registered component.
   *
   * This is a read-only snapshot — it does not trigger new checks.
   */
  getSummary(): HealthSummary;

  /**
   * Returns `true` if the platform overall status is `'healthy'`.
   *
   * Convenience shorthand for `getSummary().overallStatus === 'healthy'`.
   */
  isHealthy(): boolean;

  /**
   * Returns all currently registered component identifiers.
   */
  listComponentIds(): readonly string[];
}
