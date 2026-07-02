// apps/owner-center/src/modules/oil-analysis/report.service.ts
// Oil Analysis report generation (Sprint 08).
//
// Pure business logic — no React. Uses sample data and trend engine outputs.
// Engineering reports include approved/locked results only unless the report
// is explicitly a pending/review report.

import {
  oilSampleService,
  computeSampleCondition,
  hasLabResults,
  parseRatingLevel,
} from './sample.service';
import type { OilSampleRow, SampleCondition } from './sample.service';
import { analyzeOilParameterTrend, isTrendEligibleSample } from './trend.service';
import type { TrendDirection } from '../trend-engine';

// ── Report types ──────────────────────────────────────────────────────────────

export type OilReportType =
  | 'sample-summary'
  | 'critical-samples'
  | 'pending-review'
  | 'laboratory-results'
  | 'oil-health';

export interface OilReportFilters {
  readonly reportType: OilReportType;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly area?: string;
  readonly contractor?: string;
  readonly equipmentSearch?: string;
  readonly condition?: string;
}

export interface OilReportKpis {
  readonly total: number;
  readonly label: string;
  readonly value: number;
}

export interface GroupCountRow {
  readonly key: string;
  readonly count: number;
}

export interface SampleSummaryReport {
  readonly kind: 'sample-summary';
  readonly sampleCount: number;
  readonly byEquipment: readonly GroupCountRow[];
  readonly byArea: readonly GroupCountRow[];
  readonly byContractor: readonly GroupCountRow[];
  readonly byStatus: readonly GroupCountRow[];
  readonly byCondition: readonly GroupCountRow[];
}

export interface CriticalSampleRow {
  readonly sampleId: string;
  readonly equipmentId: string;
  readonly lubricationPointId: string;
  readonly labSampleId: string;
  readonly alertType: string;
  readonly condition: SampleCondition;
  readonly abnormalFields: string;
  readonly approvalStatus: string;
  readonly sampledAt: string;
}

export interface CriticalSamplesReport {
  readonly kind: 'critical-samples';
  readonly rows: readonly CriticalSampleRow[];
}

export interface PendingReviewRow {
  readonly sampleId: string;
  readonly equipmentId: string;
  readonly lubricationPointId: string;
  readonly labSampleId: string;
  readonly status: string;
  readonly approvalStatus: string;
  readonly pdfImportStatus: string;
  readonly pendingReason: string;
  readonly sampledAt: string;
}

export interface PendingReviewReport {
  readonly kind: 'pending-review';
  readonly rows: readonly PendingReviewRow[];
  readonly pdfPendingCount: number;
  readonly missingLpCount: number;
}

export interface LaboratoryResultRow {
  readonly sampleId: string;
  readonly equipmentId: string;
  readonly lubricationPointId: string;
  readonly labSampleId: string;
  readonly sampledAt: string;
  readonly ironPpm: number | null;
  readonly copperPpm: number | null;
  readonly siliconPpm: number | null;
  readonly waterPercent: number | null;
  readonly pqIndex: number | null;
  readonly viscosity100c: number | null;
  readonly tan: number | null;
  readonly oxidation: number | null;
  readonly particleCount: number | null;
  readonly approvalStatus: string;
}

export interface LaboratoryResultsReport {
  readonly kind: 'laboratory-results';
  readonly rows: readonly LaboratoryResultRow[];
}

export interface OilHealthRow {
  readonly equipmentId: string;
  readonly lubricationPointId: string;
  readonly sampleId: string;
  readonly labSampleId: string;
  readonly condition: SampleCondition;
  readonly lastSampleDate: string;
  readonly trendDirection: TrendDirection | null;
}

export interface OilHealthReport {
  readonly kind: 'oil-health';
  readonly rows: readonly OilHealthRow[];
}

export type OilReportResult =
  | SampleSummaryReport
  | CriticalSamplesReport
  | PendingReviewReport
  | LaboratoryResultsReport
  | OilHealthReport;

export interface OilReportOutput {
  readonly filters: OilReportFilters;
  readonly kpis: readonly OilReportKpis[];
  readonly report: OilReportResult;
  readonly generatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isApprovedOrLocked(row: OilSampleRow): boolean {
  return row.approvalStatus === 'approved' || row.approvalStatus === 'locked';
}

function isEngineeringEligible(row: OilSampleRow): boolean {
  if (!hasLabResults(row)) return false;
  return isApprovedOrLocked(row);
}

function matchesDateRange(row: OilSampleRow, filters: OilReportFilters): boolean {
  const from = filters.dateFrom?.trim();
  const to = filters.dateTo?.trim();
  if (from && row.sampledAt < from) return false;
  if (to && row.sampledAt > to) return false;
  return true;
}

function matchesCommonFilters(row: OilSampleRow, filters: OilReportFilters): boolean {
  if (!matchesDateRange(row, filters)) return false;
  if (filters.area && row.area !== filters.area) return false;
  if (filters.contractor && row.contractorId !== filters.contractor) return false;
  if (filters.condition && computeSampleCondition(row) !== filters.condition) return false;
  const q = filters.equipmentSearch?.trim().toLowerCase() ?? '';
  if (q) {
    const haystack = [
      row.equipmentId,
      row.lubricationPointId ?? '',
      row.sampleId,
      row.labSampleId,
    ].join(' ').toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

function groupBy(
  rows: readonly OilSampleRow[],
  keyFn: (row: OilSampleRow) => string,
): readonly GroupCountRow[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = keyFn(row) || '—';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function listAbnormalFields(row: OilSampleRow): string[] {
  const fields: string[] = [];

  if (row.resultStatus === 'critical' || row.resultStatus === 'caution' || row.resultStatus === 'monitor') {
    fields.push(`resultStatus:${row.resultStatus}`);
  }
  if (row.alertType.trim()) fields.push(`alert:${row.alertType.trim()}`);

  for (const [label, value] of [
    ['contamination', row.contaminationRating],
    ['equipment', row.equipmentRating],
    ['lubricant', row.lubricantRating],
  ] as const) {
    const level = parseRatingLevel(value);
    if (level === 'caution' || level === 'critical' || level === 'monitor') {
      fields.push(`${label}:${level}`);
    }
  }

  return fields;
}

function pendingReason(row: OilSampleRow): string {
  const reasons: string[] = [];
  if (!row.lubricationPointId) reasons.push('missing-lp');
  if (row.pdfImportStatus === 'pending-review') reasons.push('pdf-pending');
  if (row.status === 'imported' || row.status === 'linked' || row.status === 'pending-review') {
    reasons.push('intake');
  }
  if (hasLabResults(row) && row.approvalStatus === 'pending') reasons.push('pending-approval');
  if (row.approvalStatus === 'under-review') reasons.push('under-review');
  if (hasLabResults(row) && !row.approvalStatus) reasons.push('awaiting-review');
  return reasons.join(', ') || row.status;
}

function isPendingReviewRow(row: OilSampleRow): boolean {
  if (!row.lubricationPointId) return true;
  if (row.pdfImportStatus === 'pending-review') return true;
  if (row.status === 'imported' || row.status === 'linked' || row.status === 'pending-review') return true;
  if (hasLabResults(row) && (row.approvalStatus === 'pending' || row.approvalStatus === 'under-review')) {
    return true;
  }
  return false;
}

function trendDirectionForLp(
  equipmentId: string,
  lubricationPointId: string | null,
): TrendDirection | null {
  if (!lubricationPointId) return null;
  try {
    const analysis = analyzeOilParameterTrend({
      equipmentId,
      lubricationPointId,
      parameterId: 'iron',
      timeRange: '1y',
    });
    if (analysis.summary.sampleCount < 2) return null;
    return analysis.summary.direction;
  } catch {
    return null;
  }
}

function dataRevisionToken(): string {
  return oilSampleService.list().map((s) => `${s.id}:${s.updatedAt}`).join('|');
}

// ── Report builders ───────────────────────────────────────────────────────────

function buildSampleSummary(rows: readonly OilSampleRow[]): SampleSummaryReport {
  const eligible = rows.filter(isEngineeringEligible);
  return {
    kind: 'sample-summary',
    sampleCount: eligible.length,
    byEquipment: groupBy(eligible, (r) => r.equipmentId),
    byArea: groupBy(eligible, (r) => r.area),
    byContractor: groupBy(eligible, (r) => r.contractorId),
    byStatus: groupBy(eligible, (r) => r.status),
    byCondition: groupBy(eligible, (r) => computeSampleCondition(r)),
  };
}

function buildCriticalSamples(rows: readonly OilSampleRow[]): CriticalSamplesReport {
  const eligible = rows.filter((row) => {
    if (!isEngineeringEligible(row)) return false;
    const cond = computeSampleCondition(row);
    return cond === 'critical' || cond === 'caution';
  });

  return {
    kind: 'critical-samples',
    rows: eligible.map((row) => ({
      sampleId: row.sampleId,
      equipmentId: row.equipmentId,
      lubricationPointId: row.lubricationPointId ?? '—',
      labSampleId: row.labSampleId,
      alertType: row.alertType || '—',
      condition: computeSampleCondition(row),
      abnormalFields: listAbnormalFields(row).join('; ') || '—',
      approvalStatus: row.approvalStatus ?? '—',
      sampledAt: row.sampledAt,
    })),
  };
}

function buildPendingReview(rows: readonly OilSampleRow[]): PendingReviewReport {
  const pending = rows.filter(isPendingReviewRow);
  return {
    kind: 'pending-review',
    pdfPendingCount: pending.filter((r) => r.pdfImportStatus === 'pending-review').length,
    missingLpCount: pending.filter((r) => !r.lubricationPointId).length,
    rows: pending.map((row) => ({
      sampleId: row.sampleId,
      equipmentId: row.equipmentId,
      lubricationPointId: row.lubricationPointId ?? '—',
      labSampleId: row.labSampleId,
      status: row.status,
      approvalStatus: row.approvalStatus ?? '—',
      pdfImportStatus: row.pdfImportStatus,
      pendingReason: pendingReason(row),
      sampledAt: row.sampledAt,
    })),
  };
}

function buildLaboratoryResults(rows: readonly OilSampleRow[]): LaboratoryResultsReport {
  const eligible = rows.filter(isEngineeringEligible);
  return {
    kind: 'laboratory-results',
    rows: eligible.map((row) => ({
      sampleId: row.sampleId,
      equipmentId: row.equipmentId,
      lubricationPointId: row.lubricationPointId ?? '—',
      labSampleId: row.labSampleId,
      sampledAt: row.sampledAt,
      ironPpm: row.ironPpm,
      copperPpm: row.copperPpm,
      siliconPpm: row.siliconPpm,
      waterPercent: row.waterPercent,
      pqIndex: row.pqIndex,
      viscosity100c: row.viscosity100c,
      tan: row.tan,
      oxidation: row.oxidation,
      particleCount: row.particle6,
      approvalStatus: row.approvalStatus ?? '—',
    })),
  };
}

function buildOilHealth(rows: readonly OilSampleRow[]): OilHealthReport {
  const eligible = rows.filter(isTrendEligibleSample);
  const latestByKey = new Map<string, OilSampleRow>();

  for (const row of eligible) {
    const key = `${row.equipmentId}::${row.lubricationPointId ?? ''}`;
    const existing = latestByKey.get(key);
    if (!existing || row.sampledAt > existing.sampledAt) {
      latestByKey.set(key, row);
    }
  }

  const healthRows: OilHealthRow[] = [...latestByKey.values()]
    .sort((a, b) => a.equipmentId.localeCompare(b.equipmentId))
    .map((row) => ({
      equipmentId: row.equipmentId,
      lubricationPointId: row.lubricationPointId ?? '—',
      sampleId: row.sampleId,
      labSampleId: row.labSampleId,
      condition: computeSampleCondition(row),
      lastSampleDate: row.sampledAt,
      trendDirection: trendDirectionForLp(row.equipmentId, row.lubricationPointId),
    }));

  return { kind: 'oil-health', rows: healthRows };
}

function buildKpis(report: OilReportResult): readonly OilReportKpis[] {
  switch (report.kind) {
    case 'sample-summary':
      return [
        { total: report.sampleCount, label: 'samples', value: report.sampleCount },
        { total: report.sampleCount, label: 'equipment', value: report.byEquipment.length },
        { total: report.sampleCount, label: 'areas', value: report.byArea.length },
        { total: report.sampleCount, label: 'contractors', value: report.byContractor.length },
      ];
    case 'critical-samples':
      return [
        { total: report.rows.length, label: 'critical/caution', value: report.rows.length },
        {
          total: report.rows.length,
          label: 'critical',
          value: report.rows.filter((r) => r.condition === 'critical').length,
        },
        {
          total: report.rows.length,
          label: 'caution',
          value: report.rows.filter((r) => r.condition === 'caution').length,
        },
      ];
    case 'pending-review':
      return [
        { total: report.rows.length, label: 'pending', value: report.rows.length },
        { total: report.rows.length, label: 'pdf-pending', value: report.pdfPendingCount },
        { total: report.rows.length, label: 'missing-lp', value: report.missingLpCount },
      ];
    case 'laboratory-results':
      return [
        { total: report.rows.length, label: 'approved-results', value: report.rows.length },
      ];
    case 'oil-health':
      return [
        { total: report.rows.length, label: 'equipment-lp', value: report.rows.length },
        {
          total: report.rows.length,
          label: 'critical',
          value: report.rows.filter((r) => r.condition === 'critical').length,
        },
        {
          total: report.rows.length,
          label: 'caution',
          value: report.rows.filter((r) => r.condition === 'caution').length,
        },
      ];
    default:
      return [];
  }
}

// ── Cache ─────────────────────────────────────────────────────────────────────

interface CacheEntry {
  readonly output: OilReportOutput;
  readonly storedAt: number;
}

class OilReportCache {
  private readonly store = new Map<string, CacheEntry>();
  private readonly ttlMs = 30_000;

  get(key: string): OilReportOutput | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.storedAt > this.ttlMs) {
      this.store.delete(key);
      return null;
    }
    return entry.output;
  }

  set(key: string, output: OilReportOutput): void {
    if (this.store.size > 64) {
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }
    this.store.set(key, { output, storedAt: Date.now() });
  }
}

const reportCache = new OilReportCache();

function cacheKey(filters: OilReportFilters): string {
  return [
    filters.reportType,
    filters.dateFrom ?? '',
    filters.dateTo ?? '',
    filters.area ?? '',
    filters.contractor ?? '',
    filters.equipmentSearch ?? '',
    filters.condition ?? '',
    dataRevisionToken(),
  ].join('|');
}

// ── Public API ────────────────────────────────────────────────────────────────

export function listReportAreas(): string[] {
  const areas = new Set<string>();
  for (const row of oilSampleService.list()) {
    if (row.area.trim()) areas.add(row.area);
  }
  return [...areas].sort();
}

export function listReportContractors(): string[] {
  const contractors = new Set<string>();
  for (const row of oilSampleService.list()) {
    if (row.contractorId.trim()) contractors.add(row.contractorId);
  }
  return [...contractors].sort();
}

export function generateOilReport(filters: OilReportFilters): OilReportOutput {
  const key = cacheKey(filters);
  const cached = reportCache.get(key);
  if (cached) return cached;

  const allRows = oilSampleService.list().filter((row) => matchesCommonFilters(row, filters));

  let report: OilReportResult;
  switch (filters.reportType) {
    case 'sample-summary':
      report = buildSampleSummary(allRows);
      break;
    case 'critical-samples':
      report = buildCriticalSamples(allRows);
      break;
    case 'pending-review':
      report = buildPendingReview(allRows);
      break;
    case 'laboratory-results':
      report = buildLaboratoryResults(allRows);
      break;
    case 'oil-health':
      report = buildOilHealth(allRows);
      break;
    default:
      report = buildSampleSummary(allRows);
  }

  const output: OilReportOutput = {
    filters,
    kpis: buildKpis(report),
    report,
    generatedAt: new Date().toISOString(),
  };

  reportCache.set(key, output);
  return output;
}
