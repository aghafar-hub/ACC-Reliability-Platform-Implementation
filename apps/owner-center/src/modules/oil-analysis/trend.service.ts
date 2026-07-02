// apps/owner-center/src/modules/oil-analysis/trend.service.ts
// Oil Analysis adapter for the reusable Trend Engine.
//
// Maps approved/locked lab samples to trend series and generates
// rule-based engineering insights. Read-only — does not modify data.

import {
  trendEngineCache,
  type TrendAnalysisResult,
  type TrendDataPoint,
  type TrendInsight,
  type TrendTimeRange,
  type TrendTimelineEvent,
} from '../trend-engine';
import { oilSampleService, computeSampleCondition, hasLabResults } from './sample.service';
import type { OilSampleRow } from './sample.service';
import { oilChangeService } from '../oil-lubrication/oil-change.service';
import type { OcRecord } from '../oil-lubrication/oil-change.service';

// ── Parameter catalogue ───────────────────────────────────────────────────────

export type OilTrendParameterId =
  | 'iron'
  | 'copper'
  | 'silicon'
  | 'water'
  | 'pqIndex'
  | 'viscosity'
  | 'tan'
  | 'oxidation'
  | 'particleCount';

export interface OilTrendParameterDef {
  readonly id: OilTrendParameterId;
  readonly label: { en: string; ar: string };
  readonly unit: string;
  readonly lowerIsBetter: boolean;
  readonly field: keyof OilSampleRow;
}

export const OIL_TREND_PARAMETERS: readonly OilTrendParameterDef[] = [
  { id: 'iron',          label: { en: 'Iron',           ar: 'الحديد' },       unit: 'ppm',  lowerIsBetter: true,  field: 'ironPpm' },
  { id: 'copper',        label: { en: 'Copper',         ar: 'النحاس' },       unit: 'ppm',  lowerIsBetter: true,  field: 'copperPpm' },
  { id: 'silicon',       label: { en: 'Silicon',        ar: 'السيليكون' },    unit: 'ppm',  lowerIsBetter: true,  field: 'siliconPpm' },
  { id: 'water',         label: { en: 'Water',          ar: 'الماء' },        unit: '%',    lowerIsBetter: true,  field: 'waterPercent' },
  { id: 'pqIndex',       label: { en: 'PQ Index',       ar: 'مؤشر PQ' },      unit: '',     lowerIsBetter: true,  field: 'pqIndex' },
  { id: 'viscosity',     label: { en: 'Viscosity',      ar: 'اللزوجة' },      unit: 'cSt',  lowerIsBetter: false, field: 'viscosity100c' },
  { id: 'tan',           label: { en: 'TAN',            ar: 'TAN' },          unit: '',     lowerIsBetter: true,  field: 'tan' },
  { id: 'oxidation',     label: { en: 'Oxidation',      ar: 'الأكسدة' },      unit: '',     lowerIsBetter: true,  field: 'oxidation' },
  { id: 'particleCount', label: { en: 'Particle Count', ar: 'عدد الجسيمات' }, unit: '/mL',  lowerIsBetter: true,  field: 'particle6' },
] as const;

export function getOilTrendParameter(id: OilTrendParameterId): OilTrendParameterDef {
  const found = OIL_TREND_PARAMETERS.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown trend parameter: ${id}`);
  return found;
}

// ── Eligibility ───────────────────────────────────────────────────────────────

/** Only approved or locked laboratory results are trendable. */
export function isTrendEligibleSample(row: OilSampleRow): boolean {
  if (!hasLabResults(row)) return false;
  if (row.status === 'cancelled') return false;
  return row.approvalStatus === 'approved' || row.approvalStatus === 'locked';
}

function extractNumericValue(row: OilSampleRow, field: keyof OilSampleRow): number | null {
  const raw = row[field];
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  return raw;
}

// ── Query helpers ─────────────────────────────────────────────────────────────

export interface OilTrendQuery {
  readonly equipmentId: string;
  readonly lubricationPointId?: string | null;
  readonly parameterId: OilTrendParameterId;
  readonly timeRange: TrendTimeRange;
  readonly highlightSampleId?: string | null;
}

function filterSamples(query: Pick<OilTrendQuery, 'equipmentId' | 'lubricationPointId'>): OilSampleRow[] {
  const equipmentId = query.equipmentId.trim();
  if (!equipmentId) return [];

  return oilSampleService.list().filter((row) => {
    if (!isTrendEligibleSample(row)) return false;
    if (row.equipmentId !== equipmentId) return false;
    const lp = query.lubricationPointId?.trim();
    if (lp && row.lubricationPointId !== lp) return false;
    return true;
  });
}

function buildDataPoints(
  samples: readonly OilSampleRow[],
  field: keyof OilSampleRow,
): TrendDataPoint[] {
  const points: TrendDataPoint[] = [];
  for (const sample of samples) {
    const value = extractNumericValue(sample, field);
    if (value === null) continue;
    points.push({
      at: sample.sampledAt,
      value,
      sourceId: sample.id,
    });
  }
  return points;
}

function dataRevisionToken(samples: readonly OilSampleRow[]): string {
  if (samples.length === 0) return '0';
  return samples.map((s) => `${s.id}:${s.updatedAt}`).join('|');
}

function mapCondition(
  row: OilSampleRow | null,
): 'normal' | 'monitor' | 'caution' | 'critical' | 'unknown' {
  if (!row) return 'unknown';
  const cond = computeSampleCondition(row);
  if (cond === 'pending') return 'unknown';
  return cond;
}

// ── Analysis ──────────────────────────────────────────────────────────────────

export function analyzeOilParameterTrend(query: OilTrendQuery): TrendAnalysisResult {
  const param = getOilTrendParameter(query.parameterId);
  const samples = filterSamples(query);
  const points = buildDataPoints(samples, param.field);
  const revision = dataRevisionToken(samples);
  const lpKey = query.lubricationPointId?.trim() ?? 'all';
  const cacheKey = `oil|${query.equipmentId}|${lpKey}|${query.parameterId}|${query.timeRange}|${revision}`;

  const latestSample = [...samples].sort((a, b) => b.sampledAt.localeCompare(a.sampledAt))[0] ?? null;

  return trendEngineCache.analyze(
    cacheKey,
    {
      parameterId: query.parameterId,
      points,
      lowerIsBetter: param.lowerIsBetter,
      timeRange: query.timeRange,
    },
    {
      timeRange: query.timeRange,
      lowerIsBetter: param.lowerIsBetter,
      classifyCondition: () => mapCondition(latestSample),
    },
  );
}

export function listTrendableEquipmentIds(): string[] {
  const ids = new Set<string>();
  for (const row of oilSampleService.list()) {
    if (isTrendEligibleSample(row) && row.equipmentId.trim()) {
      ids.add(row.equipmentId);
    }
  }
  return [...ids].sort();
}

export function listTrendableLpIds(equipmentId: string): string[] {
  const ids = new Set<string>();
  for (const row of filterSamples({ equipmentId })) {
    if (row.lubricationPointId?.trim()) ids.add(row.lubricationPointId);
  }
  return [...ids].sort();
}

export function listTrendableSamples(
  equipmentId: string,
  lubricationPointId?: string | null,
): readonly OilSampleRow[] {
  return filterSamples({ equipmentId, lubricationPointId })
    .sort((a, b) => b.sampledAt.localeCompare(a.sampledAt));
}

// ── Oil change overlay ────────────────────────────────────────────────────────

export function listOilChangeEvents(
  equipmentId: string,
  lubricationPointId?: string | null,
): readonly TrendTimelineEvent[] {
  const eq = equipmentId.trim();
  if (!eq) return [];

  const lp = lubricationPointId?.trim() ?? '';

  return oilChangeService
    .listRecords()
    .filter((record: OcRecord) => {
      if (record.status !== 'completed') return false;
      if (record.equipmentId !== eq) return false;
      if (lp && record.lpId !== lp) return false;
      return true;
    })
    .map((record) => ({
      at: record.performedAt.slice(0, 10),
      label: `Oil Change — ${record.oilTypeUsed}`,
      kind: 'oil-change',
    }))
    .sort((a, b) => a.at.localeCompare(b.at));
}

// ── Engineering insights (rule-based) ─────────────────────────────────────────

const DIRECTION_LABEL: Record<string, { en: string; ar: string }> = {
  stable:          { en: 'stable',           ar: 'مستقر' },
  improving:       { en: 'improving',        ar: 'يتحسن' },
  rising:          { en: 'increasing',       ar: 'يرتفع' },
  'rapidly-rising':{ en: 'rapidly increasing', ar: 'يرتفع بسرعة' },
  'sudden-change': { en: 'showing a sudden change', ar: 'يتعرض لتغير مفاجئ' },
};

function insightSeverity(
  direction: TrendAnalysisResult['summary']['direction'],
  lowerIsBetter: boolean,
): TrendInsight['severity'] {
  if (direction === 'sudden-change') return 'alert';
  if (direction === 'rapidly-rising' && lowerIsBetter) return 'alert';
  if (direction === 'rising' && lowerIsBetter) return 'watch';
  if (direction === 'improving') return 'info';
  return 'info';
}

export function generateEngineeringInsights(
  query: OilTrendQuery,
  analysis: TrendAnalysisResult,
  locale: string,
): readonly TrendInsight[] {
  const param = getOilTrendParameter(query.parameterId);
  const label = locale === 'ar' ? param.label.ar : param.label.en;
  const dirLabel = DIRECTION_LABEL[analysis.summary.direction];
  const dirText = dirLabel ? (locale === 'ar' ? dirLabel.ar : dirLabel.en) : analysis.summary.direction;

  const insights: TrendInsight[] = [];

  if (analysis.summary.sampleCount > 0) {
    insights.push({
      id: `${query.parameterId}-direction`,
      message: locale === 'ar'
        ? `${label} ${dirText}.`
        : `${label} ${dirText}.`,
      severity: insightSeverity(analysis.summary.direction, param.lowerIsBetter),
    });
  }

  if (analysis.summary.sampleCount < 2) {
    insights.push({
      id: 'insufficient-data',
      message: locale === 'ar'
        ? 'بيانات غير كافية لتحليل الاتجاه — يتطلب عينتين معتمدتين على الأقل.'
        : 'Insufficient data for trend analysis — at least two approved samples required.',
      severity: 'info',
    });
    return insights;
  }

  const oilChanges = listOilChangeEvents(query.equipmentId, query.lubricationPointId);
  if (oilChanges.length > 0 && analysis.points.length >= 2) {
    const lastChange = oilChanges[oilChanges.length - 1]!;
    const before = analysis.points.filter((p) => p.at < lastChange.at);
    const after = analysis.points.filter((p) => p.at >= lastChange.at);

    if (before.length > 0 && after.length > 0) {
      const beforeAvg = before.reduce((s, p) => s + p.value, 0) / before.length;
      const afterAvg = after.reduce((s, p) => s + p.value, 0) / after.length;
      const delta = afterAvg - beforeAvg;
      const improved = param.lowerIsBetter ? delta < -0.01 : delta > 0.01;
      const worsened = param.lowerIsBetter ? delta > 0.01 : delta < -0.01;

      if (improved) {
        insights.push({
          id: `${query.parameterId}-post-oil-change`,
          message: locale === 'ar'
            ? `${label} تحسن بعد تغيير الزيت.`
            : `${label} improved after oil change.`,
          severity: 'info',
        });
      } else if (worsened) {
        insights.push({
          id: `${query.parameterId}-post-oil-change-worse`,
          message: locale === 'ar'
            ? `${label} ارتفع بعد تغيير الزيت — يُنصح بالمراجعة.`
            : `${label} rose after oil change — review recommended.`,
          severity: 'watch',
        });
      }
    }
  }

  if (analysis.summary.kinds.includes('accelerating') && param.lowerIsBetter) {
    insights.push({
      id: `${query.parameterId}-accelerating`,
      message: locale === 'ar'
        ? `${label} يتسارع — راقب العينة التالية عن كثب.`
        : `${label} is accelerating — monitor the next sample closely.`,
      severity: 'watch',
    });
  }

  return insights;
}

/** Combined timeline: samples + oil change markers sorted chronologically. */
export function buildTrendTimeline(
  analysis: TrendAnalysisResult,
  oilChanges: readonly TrendTimelineEvent[],
): readonly { at: string; kind: 'sample' | 'oil-change'; label: string; value?: number }[] {
  const items: { at: string; kind: 'sample' | 'oil-change'; label: string; value?: number }[] = [];

  for (const point of analysis.points) {
    items.push({
      at: point.at,
      kind: 'sample',
      label: point.at,
      value: point.value,
    });
  }

  for (const event of oilChanges) {
    items.push({
      at: event.at,
      kind: 'oil-change',
      label: event.label,
    });
  }

  return items.sort((a, b) => a.at.localeCompare(b.at));
}
