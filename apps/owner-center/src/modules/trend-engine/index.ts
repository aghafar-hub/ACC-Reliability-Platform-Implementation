// apps/owner-center/src/modules/trend-engine/index.ts
// Public exports for the reusable Trend Engine.

export type {
  TrendTimeRange,
  TrendKind,
  TrendDirection,
  TrendDataPoint,
  TrendSeriesInput,
  TrendSummary,
  TrendAnalysisResult,
  TrendTimelineEvent,
  TrendInsight,
  TrendAnalysisOptions,
} from './trend-engine';

export {
  timeRangeCutoff,
  orderChronologically,
  filterByTimeRange,
  buildParameterHistory,
  detectTrendKinds,
  resolveTrendDirection,
  analyzeTrendSeries,
  TrendEngineCache,
  trendEngineCache,
} from './trend-engine';
