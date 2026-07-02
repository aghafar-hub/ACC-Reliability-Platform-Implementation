// apps/owner-center/src/modules/trend-engine/trend-engine.ts
// Reusable Trend Engine — module-agnostic time-series analysis.
//
// Responsibilities:
//   chronological ordering, parameter history, moving / rising / falling /
//   stable / accelerating / sudden-step-change detection.
//
// Consumers: Oil Analysis, Vibration Analysis, Reliability (future).
// Pure functions only — no React, no localStorage.

// ── Types ─────────────────────────────────────────────────────────────────────

/** Preset look-back windows for trend queries. */
export type TrendTimeRange = '30d' | '90d' | '180d' | '1y' | 'all';

/** Detected trend behaviour kinds (may coexist). */
export type TrendKind =
  | 'moving'
  | 'rising'
  | 'falling'
  | 'stable'
  | 'accelerating'
  | 'sudden-step-change';

/** User-facing trend direction summary. */
export type TrendDirection =
  | 'stable'
  | 'improving'
  | 'rising'
  | 'rapidly-rising'
  | 'sudden-change';

/** Single numeric observation at a point in time. */
export interface TrendDataPoint {
  readonly at: string;
  readonly value: number;
  /** Optional source record id (sample id, measurement id, etc.). */
  readonly sourceId?: string;
}

/** Input series for analysis. */
export interface TrendSeriesInput {
  readonly parameterId: string;
  readonly points: readonly TrendDataPoint[];
  /** When true, a falling slope is classified as improving (wear metals, water, etc.). */
  readonly lowerIsBetter?: boolean;
  readonly timeRange?: TrendTimeRange;
}

/** Statistical and directional summary for a parameter series. */
export interface TrendSummary {
  readonly currentValue: number | null;
  readonly currentCondition: 'normal' | 'monitor' | 'caution' | 'critical' | 'unknown';
  readonly direction: TrendDirection;
  readonly kinds: readonly TrendKind[];
  readonly highest: number | null;
  readonly lowest: number | null;
  readonly average: number | null;
  readonly lastSampleDate: string | null;
  readonly sampleCount: number;
  readonly slope: number;
  readonly movingAverage: readonly TrendDataPoint[];
}

/** Full analysis output for one parameter series. */
export interface TrendAnalysisResult {
  readonly parameterId: string;
  readonly points: readonly TrendDataPoint[];
  readonly summary: TrendSummary;
}

/** Timeline marker for overlay events (oil change, calibration, etc.). */
export interface TrendTimelineEvent {
  readonly at: string;
  readonly label: string;
  readonly kind: string;
}

/** Rule-based engineering observation. */
export interface TrendInsight {
  readonly id: string;
  readonly message: string;
  readonly severity: 'info' | 'watch' | 'alert';
}

export interface TrendAnalysisOptions {
  readonly timeRange?: TrendTimeRange;
  readonly lowerIsBetter?: boolean;
  readonly classifyCondition?: (value: number) => TrendSummary['currentCondition'];
}

// ── Time range helpers ────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

const TIME_RANGE_DAYS: Record<Exclude<TrendTimeRange, 'all'>, number> = {
  '30d': 30,
  '90d': 90,
  '180d': 180,
  '1y': 365,
};

export function timeRangeCutoff(range: TrendTimeRange, referenceDate = new Date()): string | null {
  if (range === 'all') return null;
  const days = TIME_RANGE_DAYS[range];
  const cutoff = new Date(referenceDate.getTime() - days * MS_PER_DAY);
  return cutoff.toISOString().slice(0, 10);
}

// ── Ordering & history ────────────────────────────────────────────────────────

export function orderChronologically(
  points: readonly TrendDataPoint[],
): readonly TrendDataPoint[] {
  if (points.length <= 1) return [...points];
  return [...points].sort((a, b) => a.at.localeCompare(b.at));
}

export function filterByTimeRange(
  points: readonly TrendDataPoint[],
  range: TrendTimeRange,
  referenceDate = new Date(),
): readonly TrendDataPoint[] {
  const cutoff = timeRangeCutoff(range, referenceDate);
  if (!cutoff) return orderChronologically(points);
  return orderChronologically(points.filter((p) => p.at >= cutoff));
}

export function buildParameterHistory(
  points: readonly TrendDataPoint[],
  range: TrendTimeRange = 'all',
): readonly TrendDataPoint[] {
  return filterByTimeRange(points, range);
}

// ── Statistics ────────────────────────────────────────────────────────────────

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function linearSlope(points: readonly TrendDataPoint[]): number {
  const n = points.length;
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i += 1) {
    const x = i;
    const y = points[i]!.value;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function computeMovingAverage(
  points: readonly TrendDataPoint[],
  windowSize = 3,
): readonly TrendDataPoint[] {
  if (points.length === 0) return [];
  const size = Math.max(1, Math.min(windowSize, points.length));
  const result: TrendDataPoint[] = [];

  for (let i = 0; i < points.length; i += 1) {
    const start = Math.max(0, i - size + 1);
    const window = points.slice(start, i + 1);
    const avg = mean(window.map((p) => p.value));
    result.push({
      at: points[i]!.at,
      value: avg,
      ...(points[i]!.sourceId ? { sourceId: points[i]!.sourceId } : {}),
    });
  }

  return result;
}

function slopeThreshold(points: readonly TrendDataPoint[]): number {
  const values = points.map((p) => p.value);
  const avg = Math.abs(mean(values));
  const spread = values.length > 1 ? Math.abs(values[values.length - 1]! - values[0]!) : 0;
  return Math.max(avg * 0.015, spread * 0.05, 0.001);
}

// ── Trend detection ───────────────────────────────────────────────────────────

export function detectTrendKinds(points: readonly TrendDataPoint[]): readonly TrendKind[] {
  if (points.length < 2) return ['stable'];

  const kinds: TrendKind[] = [];
  const slope = linearSlope(points);
  const threshold = slopeThreshold(points);
  const deltas: number[] = [];

  for (let i = 1; i < points.length; i += 1) {
    deltas.push(points[i]!.value - points[i - 1]!.value);
  }

  const deltaStd = stdDev(deltas);
  const lastDelta = deltas[deltas.length - 1] ?? 0;
  const suddenThreshold = Math.max(deltaStd * 2.5, threshold * 2);

  if (Math.abs(slope) <= threshold) {
    kinds.push('stable');
  } else if (slope > threshold) {
    kinds.push('rising');
  } else {
    kinds.push('falling');
  }

  if (Math.abs(slope) > threshold && Math.abs(lastDelta) > threshold * 0.5) {
    kinds.push('moving');
  }

  if (Math.abs(lastDelta) >= suddenThreshold && suddenThreshold > 0) {
    kinds.push('sudden-step-change');
  }

  if (points.length >= 4) {
    const mid = Math.floor(points.length / 2);
    const firstSlope = linearSlope(points.slice(0, mid));
    const secondSlope = linearSlope(points.slice(mid - 1));
    if (
      Math.abs(secondSlope) > Math.abs(firstSlope) * 1.4 &&
      Math.sign(secondSlope) === Math.sign(firstSlope) &&
      Math.abs(secondSlope) > threshold
    ) {
      kinds.push('accelerating');
    }
  }

  return kinds.length > 0 ? kinds : ['stable'];
}

export function resolveTrendDirection(
  kinds: readonly TrendKind[],
  slope: number,
  lowerIsBetter: boolean,
  threshold: number,
): TrendDirection {
  if (kinds.includes('sudden-step-change')) return 'sudden-change';
  if (kinds.includes('accelerating') && slope > threshold) return 'rapidly-rising';
  if (slope > threshold) return 'rising';
  if (slope < -threshold && lowerIsBetter) return 'improving';
  if (kinds.includes('falling') && lowerIsBetter) return 'improving';
  return 'stable';
}

// ── Main analysis ─────────────────────────────────────────────────────────────

export function analyzeTrendSeries(
  input: TrendSeriesInput,
  options: TrendAnalysisOptions = {},
): TrendAnalysisResult {
  const range = options.timeRange ?? input.timeRange ?? 'all';
  const lowerIsBetter = options.lowerIsBetter ?? input.lowerIsBetter ?? false;
  const points = buildParameterHistory(input.points, range);
  const values = points.map((p) => p.value);

  const highest = values.length > 0 ? Math.max(...values) : null;
  const lowest = values.length > 0 ? Math.min(...values) : null;
  const average = values.length > 0 ? mean(values) : null;
  const lastPoint = points.length > 0 ? points[points.length - 1]! : null;
  const slope = linearSlope(points);
  const threshold = slopeThreshold(points);
  const kinds = detectTrendKinds(points);
  const direction = resolveTrendDirection(kinds, slope, lowerIsBetter, threshold);
  const movingAverage = computeMovingAverage(points);

  const currentValue = lastPoint?.value ?? null;
  const currentCondition = currentValue !== null && options.classifyCondition
    ? options.classifyCondition(currentValue)
    : 'unknown';

  return {
    parameterId: input.parameterId,
    points,
    summary: {
      currentValue,
      currentCondition,
      direction,
      kinds,
      highest,
      lowest,
      average,
      lastSampleDate: lastPoint?.at ?? null,
      sampleCount: points.length,
      slope,
      movingAverage,
    },
  };
}

// ── Cache ─────────────────────────────────────────────────────────────────────

interface CacheEntry {
  readonly result: TrendAnalysisResult;
  readonly storedAt: number;
}

/**
 * Lightweight in-memory cache for trend calculations.
 * Key should include parameter id, filters, and a data revision token.
 */
export class TrendEngineCache {
  private readonly store = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(maxEntries = 128, ttlMs = 60_000) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  get(key: string): TrendAnalysisResult | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.storedAt > this.ttlMs) {
      this.store.delete(key);
      return null;
    }
    return entry.result;
  }

  set(key: string, result: TrendAnalysisResult): void {
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }
    this.store.set(key, { result, storedAt: Date.now() });
  }

  analyze(
    key: string,
    input: TrendSeriesInput,
    options: TrendAnalysisOptions = {},
  ): TrendAnalysisResult {
    const cached = this.get(key);
    if (cached) return cached;
    const result = analyzeTrendSeries(input, options);
    this.set(key, result);
    return result;
  }

  clear(): void {
    this.store.clear();
  }
}

/** Shared singleton cache for UI-driven trend queries. */
export const trendEngineCache = new TrendEngineCache();
