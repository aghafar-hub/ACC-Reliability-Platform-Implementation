// platform/sdk/src/clients/health-client.ts
// SDK health client interface.
//
// Business modules use IHealthClient to register their own health checks and
// to query platform-wide health state.  Modules must never reach into the
// HealthService directly (PS-114 §8).

import type {
  HealthCheckResult,
  HealthComponentRegistration,
  HealthComponentStatus,
  HealthSummary,
} from '@acc-reliability/services';

/**
 * SDK health monitoring client.
 *
 * Provides full access to the platform Health Service through the SDK façade.
 * Business modules register their own health-check functions here and may
 * query the platform-wide health summary at any time.
 *
 * All methods delegate to the underlying {@link IHealthService}; no additional
 * logic is applied by the client.
 */
export interface IHealthClient {
  /**
   * Registers a component and its health check function.
   *
   * @throws {HealthError} if a component with the same id is already registered.
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
   * @throws {HealthComponentNotFoundError} if the component is not registered.
   */
  check(componentId: string): Promise<HealthCheckResult>;

  /**
   * Runs all registered health checks in parallel and returns every result.
   * Individual failures do not abort the others.
   */
  checkAll(): Promise<readonly HealthCheckResult[]>;

  /**
   * Returns the most recent status snapshot for a single component, or `null`
   * if the component is not registered.
   */
  getStatus(componentId: string): HealthComponentStatus | null;

  /**
   * Returns the platform-wide health summary computed from the most recent
   * check result for every registered component.
   */
  getSummary(): HealthSummary;

  /**
   * Returns `true` when the platform overall health status is `'healthy'`.
   */
  isHealthy(): boolean;
}
