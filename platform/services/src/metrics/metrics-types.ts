// platform/services/src/metrics/metrics-types.ts
// All types and the IMetricsService contract for runtime telemetry collection.
//
// Responsibilities of this module:
//   - Define every type consumed by IMetricsService callers.
//   - Describe six metric kinds: counter, gauge, histogram, timer, duration, rate.
//   - Provide ten built-in categories matching the platform domain model.
//   - Expose factory helpers for branded identifiers.
//
// Non-responsibilities (enforced by design):
//   - No persistence, no SQL, no Google Sheets.
//   - No dashboard, no charts, no reports.
//   - No aggregation or analytics engine.
//   - No business logic.

// ── MetricId ──────────────────────────────────────────────────────────────────

declare const MetricIdBrand: unique symbol;

/**
 * Branded string that uniquely identifies a metric within the platform.
 * Always produced via {@link createMetricId}; never cast from a raw string.
 */
export type MetricId = string & { readonly [MetricIdBrand]: 'MetricId' };

/**
 * Creates a {@link MetricId} from a plain string.
 * Rejects blank or whitespace-only values.
 */
export function createMetricId(value: string): MetricId {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error('MetricId must not be blank');
  }
  return trimmed as MetricId;
}

// ── MetricKind ────────────────────────────────────────────────────────────────

/**
 * The six supported metric collection kinds.
 *
 * - `counter`   — Monotonically increasing value; represents a cumulative total.
 *                 Use `increment()` to add delta values; `sum` is the running total.
 * - `gauge`     — Instantaneous reading that can go up or down freely.
 *                 Use `set()` for absolute assignment; `lastSample.value` is current.
 * - `histogram` — Distribution of observed values; suitable for request sizes, queue depths.
 *                 Use `record()` for each observation; `min`/`max`/`sum` summarise the distribution.
 * - `timer`     — Elapsed-time distribution in milliseconds; a time-specialised histogram.
 *                 Use `timing()` or `startTimer()` to record latencies.
 * - `duration`  — A single elapsed-time observation; not a distribution.
 *                 Use `timing()` for one-shot measurements.
 * - `rate`      — Rate of events per second; future aggregation layers will compute this
 *                 from raw counter increments. Recorded the same way as `counter`.
 */
export type MetricKind = 'counter' | 'gauge' | 'histogram' | 'timer' | 'duration' | 'rate';

// ── MetricCategory ────────────────────────────────────────────────────────────

/** The ten built-in metric categories. */
export type KnownMetricCategory =
  | 'platform'
  | 'kernel'
  | 'storage'
  | 'communication'
  | 'health'
  | 'module'
  | 'security'
  | 'performance'
  | 'business'
  | 'custom';

/**
 * Open-union metric category.
 * Business modules may introduce custom category strings without modifying the core type.
 */
export type MetricCategory = KnownMetricCategory | (string & Record<never, never>);

/** Ordered constant tuple of all built-in metric categories. */
export const METRIC_CATEGORIES: readonly KnownMetricCategory[] = [
  'platform',
  'kernel',
  'storage',
  'communication',
  'health',
  'module',
  'security',
  'performance',
  'business',
  'custom',
] as const;

// ── MetricLevel ───────────────────────────────────────────────────────────────

/**
 * Importance level attached to a metric definition.
 * Used by future export and alerting integrations to filter by severity.
 * Does not affect collection behaviour in the current implementation.
 */
export type MetricLevel = 'debug' | 'info' | 'warning' | 'critical';

// ── MetricValue ───────────────────────────────────────────────────────────────

/** A raw numeric observation. All metric recording methods accept this type. */
export type MetricValue = number;

// ── MetricTags ────────────────────────────────────────────────────────────────

/**
 * Immutable key-value pairs attached to a metric definition or sample.
 * Enable multi-dimensional grouping in future monitoring integrations.
 * Keys and values must be plain strings.
 */
export type MetricTags = Readonly<Record<string, string>>;

// ── MetricDefinition ──────────────────────────────────────────────────────────

/**
 * Descriptor for a metric — registered once before any samples are recorded.
 *
 * The definition is immutable after registration.  No field may be modified
 * in place; unregister and re-register to change a definition.
 */
export interface MetricDefinition {
  /** Stable unique identifier.  Use {@link createMetricId} to produce this value. */
  readonly id: MetricId;
  /** Human-readable name suitable for display in future dashboards. */
  readonly name: string;
  /** Explains what this metric measures and why it matters. */
  readonly description: string;
  /** Collection kind that determines which recording methods are semantically valid. */
  readonly kind: MetricKind;
  /** Functional area this metric belongs to. */
  readonly category: MetricCategory;
  /** Importance level consumed by future export and alerting layers. */
  readonly level: MetricLevel;
  /**
   * Optional unit label (e.g. `'ms'`, `'bytes'`, `'count'`, `'requests/s'`).
   * Informational only — no unit conversion is applied by the service.
   */
  readonly unit?: string;
  /**
   * Static tags inherited by every sample recorded for this metric.
   * Per-sample tags are merged on top at export time.
   */
  readonly tags?: MetricTags;
}

// ── MetricSample ──────────────────────────────────────────────────────────────

/**
 * A single immutable observation recorded for a metric.
 *
 * Samples are frozen at creation time.  The service retains recent samples
 * per metric up to `MetricsServiceOptions.maxSamplesPerMetric`; older entries
 * are evicted when the buffer is full.
 */
export interface MetricSample {
  readonly metricId: MetricId;
  readonly value: MetricValue;
  /** ISO 8601 UTC timestamp of the observation. */
  readonly timestamp: string;
  /**
   * Per-sample tags.  Merged with definition-level tags by future export layers;
   * per-sample tags take precedence on key collision.
   */
  readonly tags?: MetricTags;
}

// ── MetricSnapshot ────────────────────────────────────────────────────────────

/**
 * Point-in-time view of the current state of a single metric.
 *
 * Returned by {@link IMetricsService.getSnapshot}.
 * All fields are readonly; the object is frozen by the service.
 */
export interface MetricSnapshot {
  /** The original registration descriptor. */
  readonly definition: MetricDefinition;
  /** Most recent sample, or `null` if no sample has been recorded yet. */
  readonly lastSample: MetricSample | null;
  /** Total number of samples recorded since registration (or last {@link IMetricsService.reset}). */
  readonly sampleCount: number;
  /** ISO 8601 UTC timestamp when this metric was registered. */
  readonly registeredAt: string;
  /**
   * Sum of all recorded sample values since registration or last reset.
   *
   * Semantics by kind:
   * - `counter` / `rate` — running total (the actual counter value).
   * - `gauge`            — sum of all set values (less meaningful; use `lastSample.value`).
   * - `histogram` / `timer` / `duration` — total of all observations (divide by `sampleCount` for mean).
   */
  readonly sum: number;
  /** Minimum observed value, or `null` if no samples exist. */
  readonly min: number | null;
  /** Maximum observed value, or `null` if no samples exist. */
  readonly max: number | null;
}

// ── MetricSummary ─────────────────────────────────────────────────────────────

/**
 * Platform-wide summary of all registered metrics.
 *
 * Contains counts and timestamps only — no individual sample data.
 * Call {@link IMetricsService.getAllSnapshots} to obtain per-metric state.
 */
export interface MetricSummary {
  /** Total number of metrics currently registered. */
  readonly totalMetrics: number;
  /** Number of registered metrics per category key. */
  readonly metricsByCategory: Readonly<Record<string, number>>;
  /** Number of registered metrics per kind. */
  readonly metricsByKind: Readonly<Partial<Record<MetricKind, number>>>;
  /** Total samples recorded across all metrics since the last {@link IMetricsService.resetAll}. */
  readonly totalSamples: number;
  /** ISO 8601 UTC timestamp when this summary was computed. */
  readonly capturedAt: string;
}

// ── MetricsServiceOptions ─────────────────────────────────────────────────────

/** Optional configuration for the `MetricsService` implementation. */
export interface MetricsServiceOptions {
  /**
   * Maximum number of recent samples retained per metric for future export via
   * {@link IMetricsService.flush}.  When the buffer is full the oldest sample
   * is evicted to make room for the new one.
   *
   * @default 100
   */
  readonly maxSamplesPerMetric?: number;
}

// ── IMetricsService ───────────────────────────────────────────────────────────

/**
 * Contract for the platform runtime telemetry collection service.
 *
 * ## Responsibilities
 * - Accept metric registrations from platform components and business modules.
 * - Record numeric samples against registered metrics with high performance.
 * - Provide in-memory snapshots and summaries for diagnostic consumption.
 * - Expose a flush surface for future persistence and export integrations.
 *
 * ## Non-responsibilities (by design)
 * - Persistence — future milestone.
 * - Aggregation or analytics — future milestone.
 * - Dashboard or report generation — never (UI concern).
 * - Business logic — never (module concern).
 *
 * ## Future integration points
 * - Health Service: pass a `MetricsService` instance to record health check durations.
 * - Storage Abstraction: wrap repository operations with `startTimer()`.
 * - Notification Service: record notification dispatch durations when built.
 * - Action Service: record action execution durations when built.
 * - Business Modules: record custom business metrics via `MetricCategory = 'business'`.
 * - Monitoring Dashboard: consume snapshots via `getAllSnapshots()` and `getSummary()`.
 */
export interface IMetricsService {

  // ── Registration ─────────────────────────────────────────────────────────────

  /**
   * Registers a new metric definition.
   *
   * @throws `MetricAlreadyRegisteredError` if a metric with the same id is already registered.
   */
  register(definition: MetricDefinition): void;

  /**
   * Removes a metric and discards all its buffered samples.
   * The aggregate state (sum, count, min, max) is also cleared.
   * No-op if the metric is not registered.
   */
  unregister(metricId: MetricId): void;

  // ── Recording ────────────────────────────────────────────────────────────────

  /**
   * Records a raw numeric observation for a registered metric.
   *
   * @throws `MetricNotFoundError` if the metric is not registered.
   */
  record(metricId: MetricId, value: MetricValue, tags?: MetricTags): void;

  /**
   * Records a positive delta for a metric.
   * Intended for `counter` and `rate` kinds; valid for all kinds.
   *
   * @param amount Delta to add. Default: 1.
   * @throws `MetricNotFoundError` if the metric is not registered.
   */
  increment(metricId: MetricId, amount?: MetricValue): void;

  /**
   * Records a negative delta for a metric.
   * Intended for `gauge` kind; valid for all kinds.
   *
   * @param amount Magnitude to subtract. Default: 1.
   * @throws `MetricNotFoundError` if the metric is not registered.
   */
  decrement(metricId: MetricId, amount?: MetricValue): void;

  /**
   * Records an absolute value for a gauge metric.
   * Equivalent to `record(metricId, value)`.
   *
   * @throws `MetricNotFoundError` if the metric is not registered.
   */
  set(metricId: MetricId, value: MetricValue): void;

  /**
   * Records an elapsed-time observation in milliseconds.
   * Intended for `timer` and `duration` kinds; valid for all kinds.
   *
   * @throws `MetricNotFoundError` if the metric is not registered.
   */
  timing(metricId: MetricId, durationMs: MetricValue): void;

  // ── Timer helpers ─────────────────────────────────────────────────────────────

  /**
   * Starts a high-resolution timer for `metricId`.
   *
   * Verifies the metric exists at call time.  Returns a `stop` closure that,
   * when called, records the elapsed duration in milliseconds and returns the
   * measured value.
   *
   * ```ts
   * const stop = metrics.startTimer(STORAGE_QUERY_DURATION_ID);
   * const result = await repo.findAll();
   * const durationMs = stop();
   * ```
   *
   * @throws `MetricNotFoundError` if the metric is not registered at start time.
   * @throws `MetricNotFoundError` from the returned `stop()` function if the
   *         metric was unregistered between start and stop.
   */
  startTimer(metricId: MetricId): () => MetricValue;

  // ── Query ─────────────────────────────────────────────────────────────────────

  /**
   * Returns a frozen snapshot of the current state of a single metric.
   * Returns `null` if the metric is not registered — does not throw.
   */
  getSnapshot(metricId: MetricId): MetricSnapshot | null;

  /**
   * Returns frozen snapshots for all registered metrics.
   * Result order is insertion order.
   */
  getAllSnapshots(): readonly MetricSnapshot[];

  /**
   * Returns frozen snapshots for all metrics in the given category.
   */
  getSnapshotsByCategory(category: MetricCategory): readonly MetricSnapshot[];

  /**
   * Returns a frozen platform-wide summary.
   * Does not contain individual sample data.
   * Does not trigger new samples — a pure read of current in-memory state.
   */
  getSummary(): MetricSummary;

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  /** Returns the ids of all currently registered metrics in insertion order. */
  listMetricIds(): readonly MetricId[];

  /** Returns `true` if a metric with the given id is currently registered. */
  isRegistered(metricId: MetricId): boolean;

  // ── Export surface (future persistence integration) ───────────────────────────

  /**
   * Returns all samples buffered since the last flush and clears each metric's
   * sample buffer.
   *
   * The aggregate state (sampleCount, sum, min, max) is **not** affected.
   *
   * Intended for future persistence and monitoring-export integrations.
   * The number of samples returned per metric is bounded by
   * `MetricsServiceOptions.maxSamplesPerMetric`.
   */
  flush(): readonly MetricSample[];

  /**
   * Resets all aggregate state (sampleCount, sum, min, max, lastSample) and
   * the sample buffer for a single metric.
   *
   * @throws `MetricNotFoundError` if the metric is not registered.
   */
  reset(metricId: MetricId): void;

  /**
   * Resets all aggregate state and sample buffers for every registered metric.
   * Metric definitions remain registered.
   */
  resetAll(): void;
}
