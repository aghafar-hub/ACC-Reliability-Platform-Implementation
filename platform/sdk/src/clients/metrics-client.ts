// platform/sdk/src/clients/metrics-client.ts
// SDK metrics client interface.
//
// Business modules record telemetry through this client only (PS-114 §11).
// Modules must never implement independent metrics collection systems.

import type {
  MetricDefinition,
  MetricId,
  MetricKind,
  MetricSample,
  MetricSnapshot,
  MetricSummary,
  MetricTags,
  MetricValue,
} from '@acc-reliability/services';

// Re-export MetricKind so modules do not need to import from services directly.
export type { MetricKind };

/**
 * SDK telemetry / metrics client.
 *
 * Covers the full recording lifecycle: register a metric once on module
 * startup, then call `record`, `increment`, or `timing` on every operation.
 * Snapshots and the summary are available for in-process diagnostics.
 *
 * All methods delegate to the underlying {@link IMetricsService}; no
 * additional logic is applied by the client.
 */
export interface IMetricsClient {
  /**
   * Registers a new metric definition.
   *
   * @throws {MetricAlreadyRegisteredError} if the same id is already registered.
   */
  register(definition: MetricDefinition): void;

  /**
   * Removes a metric and discards all its buffered samples.
   * No-op if the metric is not registered.
   */
  unregister(metricId: MetricId): void;

  /**
   * Records a raw numeric observation.
   *
   * @throws {MetricNotFoundError} if the metric is not registered.
   */
  record(metricId: MetricId, value: MetricValue, tags?: MetricTags): void;

  /**
   * Records a positive delta (default: `1`).
   *
   * @throws {MetricNotFoundError} if the metric is not registered.
   */
  increment(metricId: MetricId, amount?: MetricValue): void;

  /**
   * Records a negative delta (default: `1`).
   *
   * @throws {MetricNotFoundError} if the metric is not registered.
   */
  decrement(metricId: MetricId, amount?: MetricValue): void;

  /**
   * Records an elapsed-time observation in milliseconds.
   *
   * @throws {MetricNotFoundError} if the metric is not registered.
   */
  timing(metricId: MetricId, durationMs: MetricValue): void;

  /**
   * Returns a frozen snapshot of the current state of a single metric,
   * or `null` if the metric is not registered.
   */
  getSnapshot(metricId: MetricId): MetricSnapshot | null;

  /**
   * Returns frozen snapshots for all registered metrics.
   */
  getAllSnapshots(): readonly MetricSnapshot[];

  /**
   * Returns the platform-wide metrics summary.
   */
  getSummary(): MetricSummary;

  /**
   * Returns and clears the in-memory sample buffer for all metrics.
   * Intended for future persistence and export integrations.
   */
  flush(): readonly MetricSample[];
}
