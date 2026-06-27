// platform/services/src/metrics/metrics-service.ts
// In-memory implementation of IMetricsService.
//
// Design constraints:
//   - No persistence, no external I/O.
//   - High performance: O(1) record(), increment(), set(), timing().
//   - Low allocation: MetricSample objects are frozen at creation; no cloning on read.
//   - Rolling buffer per metric, bounded by maxSamplesPerMetric (default 100).
//   - All public snapshot/summary objects are frozen before return.
//
// Future integration hooks:
//   - flush() drains buffered samples for persistence/export adapters.
//   - MetricDefinition.tags and per-sample tags are preserved for export layers.
//   - startTimer() uses performance.now() for sub-millisecond resolution.

import {
  IMetricsService,
  MetricCategory,
  MetricDefinition,
  MetricId,
  MetricKind,
  MetricSample,
  MetricSnapshot,
  MetricSummary,
  MetricTags,
  MetricValue,
  MetricsServiceOptions,
} from './metrics-types';
import { MetricAlreadyRegisteredError, MetricNotFoundError } from '../errors';

// ── Internal mutable state per metric ─────────────────────────────────────────

interface MetricState {
  readonly definition: MetricDefinition;
  readonly registeredAt: string;
  sampleCount: number;
  sum: number;
  min: number | null;
  max: number | null;
  lastSample: MetricSample | null;
  /** Rolling buffer of recent samples; evicted FIFO when full. */
  buffer: MetricSample[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_MAX_SAMPLES_PER_METRIC = 100;

// ── MetricsService ────────────────────────────────────────────────────────────

/**
 * In-memory runtime telemetry collection service.
 *
 * All operations are synchronous and O(1) for recording.  No background
 * threads, no timers, no network calls.
 *
 * The service id `platform.metrics` is reserved in the Service Registry.
 * Registration into bootstrap is deferred to the SDK milestone.
 */
export class MetricsService implements IMetricsService {
  private readonly states = new Map<string, MetricState>();
  private readonly maxSamplesPerMetric: number;

  constructor(options?: MetricsServiceOptions) {
    this.maxSamplesPerMetric =
      options?.maxSamplesPerMetric ?? DEFAULT_MAX_SAMPLES_PER_METRIC;
  }

  // ── Registration ─────────────────────────────────────────────────────────────

  register(definition: MetricDefinition): void {
    if (this.states.has(definition.id)) {
      throw new MetricAlreadyRegisteredError(definition.id);
    }
    const state: MetricState = {
      definition,
      registeredAt: new Date().toISOString(),
      sampleCount: 0,
      sum: 0,
      min: null,
      max: null,
      lastSample: null,
      buffer: [],
    };
    this.states.set(definition.id, state);
  }

  unregister(metricId: MetricId): void {
    this.states.delete(metricId);
  }

  // ── Recording ────────────────────────────────────────────────────────────────

  record(metricId: MetricId, value: MetricValue, tags?: MetricTags): void {
    const state = this.requireState(metricId);
    const sample: MetricSample = Object.freeze({
      metricId,
      value,
      timestamp: new Date().toISOString(),
      ...(tags !== undefined ? { tags } : {}),
    });
    this.applySample(state, sample);
  }

  increment(metricId: MetricId, amount: MetricValue = 1): void {
    this.record(metricId, amount);
  }

  decrement(metricId: MetricId, amount: MetricValue = 1): void {
    this.record(metricId, -amount);
  }

  set(metricId: MetricId, value: MetricValue): void {
    this.record(metricId, value);
  }

  timing(metricId: MetricId, durationMs: MetricValue): void {
    this.record(metricId, durationMs);
  }

  // ── Timer helpers ─────────────────────────────────────────────────────────────

  startTimer(metricId: MetricId): () => MetricValue {
    this.requireState(metricId);
    const startMs = performance.now();
    return (): MetricValue => {
      const durationMs = performance.now() - startMs;
      this.timing(metricId, durationMs);
      return durationMs;
    };
  }

  // ── Query ─────────────────────────────────────────────────────────────────────

  getSnapshot(metricId: MetricId): MetricSnapshot | null {
    const state = this.states.get(metricId);
    return state !== undefined ? this.buildSnapshot(state) : null;
  }

  getAllSnapshots(): readonly MetricSnapshot[] {
    const result: MetricSnapshot[] = [];
    for (const state of this.states.values()) {
      result.push(this.buildSnapshot(state));
    }
    return result;
  }

  getSnapshotsByCategory(category: MetricCategory): readonly MetricSnapshot[] {
    const result: MetricSnapshot[] = [];
    for (const state of this.states.values()) {
      if (state.definition.category === category) {
        result.push(this.buildSnapshot(state));
      }
    }
    return result;
  }

  getSummary(): MetricSummary {
    const metricsByCategory: Record<string, number> = {};
    const metricsByKind: Partial<Record<MetricKind, number>> = {};
    let totalSamples = 0;

    for (const state of this.states.values()) {
      const cat = state.definition.category;
      metricsByCategory[cat] = (metricsByCategory[cat] ?? 0) + 1;

      const kind = state.definition.kind;
      metricsByKind[kind] = (metricsByKind[kind] ?? 0) + 1;

      totalSamples += state.sampleCount;
    }

    return Object.freeze({
      totalMetrics: this.states.size,
      metricsByCategory: Object.freeze(metricsByCategory),
      metricsByKind: Object.freeze(metricsByKind),
      totalSamples,
      capturedAt: new Date().toISOString(),
    });
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  listMetricIds(): readonly MetricId[] {
    return Array.from(this.states.keys()) as MetricId[];
  }

  isRegistered(metricId: MetricId): boolean {
    return this.states.has(metricId);
  }

  // ── Export surface ────────────────────────────────────────────────────────────

  flush(): readonly MetricSample[] {
    const drained: MetricSample[] = [];
    for (const state of this.states.values()) {
      if (state.buffer.length > 0) {
        drained.push(...state.buffer);
        state.buffer = [];
      }
    }
    return drained;
  }

  reset(metricId: MetricId): void {
    const state = this.requireState(metricId);
    this.clearState(state);
  }

  resetAll(): void {
    for (const state of this.states.values()) {
      this.clearState(state);
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private requireState(metricId: MetricId): MetricState {
    const state = this.states.get(metricId);
    if (state === undefined) {
      throw new MetricNotFoundError(metricId);
    }
    return state;
  }

  private applySample(state: MetricState, sample: MetricSample): void {
    state.sampleCount += 1;
    state.sum += sample.value;
    state.min = state.min === null ? sample.value : Math.min(state.min, sample.value);
    state.max = state.max === null ? sample.value : Math.max(state.max, sample.value);
    state.lastSample = sample;

    if (state.buffer.length >= this.maxSamplesPerMetric) {
      state.buffer.shift();
    }
    state.buffer.push(sample);
  }

  private buildSnapshot(state: MetricState): MetricSnapshot {
    return Object.freeze<MetricSnapshot>({
      definition: state.definition,
      lastSample: state.lastSample,
      sampleCount: state.sampleCount,
      registeredAt: state.registeredAt,
      sum: state.sum,
      min: state.min,
      max: state.max,
    });
  }

  private clearState(state: MetricState): void {
    state.sampleCount = 0;
    state.sum = 0;
    state.min = null;
    state.max = null;
    state.lastSample = null;
    state.buffer = [];
  }
}
