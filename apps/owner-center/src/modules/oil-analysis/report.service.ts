// apps/owner-center/src/modules/oil-analysis/report.service.ts
// OA-008 — Oil Analysis report generation (contractor-scoped, on-read).

import type { OilReportType } from './report-catalog';
import { findReportTemplate } from './report-catalog';
import type { OilAnalysisContractorScope } from './contractor-scope';
import { lpRegisterService, type LpRegisterConditionStatus, type LpRegisterKpis } from './lp-register.service';
import { oilChangeService, type OcTask } from '../oil-lubrication/oil-change.service';
import { getPlatformSdk } from '../platform/platform-master-access';
import {
  oilSampleService,
  computeSampleCondition,
  hasLabResults,
  type OilSampleRow,
  type SampleCondition,
} from './sample.service';
import { isApprovalWorkflowEnabled, isSampleResultFinalized } from './approval-workflow';

// ── Filters & output ──────────────────────────────────────────────────────────

export type { OilReportType };

export interface OilReportFilters {
  readonly reportType: OilReportType;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly lpIds?: readonly string[];
  readonly equipmentId?: string;
  readonly area?: string;
  readonly contractor?: string;
  readonly oilType?: string;
  readonly reportStatus?: string;
  readonly equipmentStatus?: string;
  readonly sampleId?: string;
}

export interface OilReportKpis {
  readonly label: string;
  readonly value: number;
}

export interface GroupCountRow {
  readonly key: string;
  readonly count: number;
}

export interface OilReportColumn {
  readonly id: string;
  readonly label: string;
}

export interface OilReportChartSlice {
  readonly label: string;
  readonly value: number;
  readonly color?: string;
}

export interface OilReportChart {
  readonly title: string;
  readonly slices: readonly OilReportChartSlice[];
}

export interface OilReportBreakdown {
  readonly title: string;
  readonly rows: readonly GroupCountRow[];
}

export interface OilReportResult {
  readonly kind: OilReportType;
  readonly title: string;
  readonly tableColumns: readonly OilReportColumn[];
  readonly tableRows: readonly Record<string, string | number | null>[];
  readonly breakdowns: readonly OilReportBreakdown[];
  readonly charts: readonly OilReportChart[];
}

export interface OilReportOutput {
  readonly filters: OilReportFilters;
  readonly kpis: readonly OilReportKpis[];
  readonly report: OilReportResult;
  readonly generatedAt: string;
  readonly reference: string;
}

export interface OilReportFilterOptions {
  readonly lpIds: readonly string[];
  readonly equipmentIds: readonly string[];
  readonly areas: readonly string[];
  readonly contractors: readonly string[];
  readonly oilTypes: readonly string[];
  readonly reportStatuses: readonly string[];
  readonly equipmentStatuses: readonly string[];
}

// ── Scoped row model ──────────────────────────────────────────────────────────

interface ScopedLpRow {
  readonly lpId: string;
  readonly equipmentId: string;
  readonly equipmentName: string;
  readonly area: string;
  readonly contractorId: string;
  readonly oilType: string;
  readonly lastSampleStatus: LpRegisterConditionStatus;
  readonly isSampleOverdue: boolean;
  readonly nextSampleDate: string | null;
  readonly lastSampleDate: string | null;
  readonly reportStatus: string;
  readonly latestSample: OilSampleRow | null;
}

function computeScopedKpis(rows: readonly ScopedLpRow[]): LpRegisterKpis {
  return {
    total: rows.length,
    normal: rows.filter((r) => r.lastSampleStatus === 'normal').length,
    caution: rows.filter((r) => r.lastSampleStatus === 'caution').length,
    alert: rows.filter((r) => r.lastSampleStatus === 'alert').length,
    pending: rows.filter((r) => r.lastSampleStatus === 'pending').length,
    noSample: rows.filter((r) => r.lastSampleStatus === 'none').length,
    overdue: rows.filter((r) => r.isSampleOverdue).length,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function applyContractorScope(
  scope: OilAnalysisContractorScope,
  contractorFilter?: string,
): string | undefined {
  if (!scope.canViewAllContractors) return scope.lockedContractorId;
  return contractorFilter?.trim() || undefined;
}

function distinctSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function resolveOilType(lpId: string): string {
  const task = oilChangeService.listTasks().find((t) => t.lpId === lpId);
  if (task?.oilType?.trim()) return task.oilType.trim();
  const lp = getPlatformSdk().lubricationPoints.findByLpId(lpId);
  return lp?.lubricant?.trim() || '—';
}

function resolveReportStatus(sample: OilSampleRow | null): string {
  if (!sample) return 'No sample';
  if (sample.approvalStatus === 'locked' || sample.approvalStatus === 'approved') {
    return 'Approved';
  }
  if (sample.approvalStatus === 'under-review') return 'Under review';
  if (sample.approvalStatus === 'pending') return 'Pending approval';
  if (sample.pdfImportStatus === 'pending-review') return 'PDF pending review';
  if (!hasLabResults(sample)) return 'Awaiting lab results';
  return 'Analysed';
}

function latestSampleByLp(samples: readonly OilSampleRow[]): Map<string, OilSampleRow> {
  const map = new Map<string, OilSampleRow>();
  for (const sample of samples) {
    const lpId = sample.lubricationPointId?.trim();
    if (!lpId) continue;
    const existing = map.get(lpId);
    if (!existing || sample.sampledAt.localeCompare(existing.sampledAt) > 0) {
      map.set(lpId, sample);
    }
  }
  return map;
}

function buildScopedLpRows(
  scope: OilAnalysisContractorScope,
  contractorFilter?: string,
): ScopedLpRow[] {
  const latestByLp = latestSampleByLp(oilSampleService.list());
  const baseRows = lpRegisterService.buildRows(scope);
  const contractorScoped = applyContractorScope(scope, contractorFilter);

  return baseRows
    .filter((row) => !contractorScoped || row.contractorId === contractorScoped)
    .map((row) => {
      const sample = latestByLp.get(row.lpId) ?? null;
      return {
        lpId: row.lpId,
        equipmentId: row.equipmentId,
        equipmentName: row.equipmentName,
        area: row.area,
        contractorId: row.contractorId,
        oilType: resolveOilType(row.lpId),
        lastSampleStatus: row.lastSampleStatus,
        isSampleOverdue: row.isSampleOverdue,
        nextSampleDate: row.nextSampleDate,
        lastSampleDate: row.lastSampleDate,
        reportStatus: resolveReportStatus(sample),
        latestSample: sample,
      };
    });
}

function matchesDateRange(iso: string | null, from?: string, to?: string): boolean {
  if (!iso) return !from && !to;
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
}

function matchesLpFilters(
  row: ScopedLpRow,
  filters: OilReportFilters,
): boolean {
  if (filters.lpIds && filters.lpIds.length > 0 && !filters.lpIds.includes(row.lpId)) {
    return false;
  }
  if (filters.equipmentId && row.equipmentId !== filters.equipmentId) return false;
  if (filters.area && row.area !== filters.area) return false;
  if (filters.oilType && row.oilType !== filters.oilType) return false;
  if (filters.reportStatus && row.reportStatus !== filters.reportStatus) return false;

  if (filters.equipmentStatus) {
    if (filters.equipmentStatus === 'overdue') {
      if (!row.isSampleOverdue) return false;
    } else if (row.lastSampleStatus !== filters.equipmentStatus) {
      return false;
    }
  }

  if (filters.dateFrom || filters.dateTo) {
    const inRange =
      matchesDateRange(row.lastSampleDate, filters.dateFrom, filters.dateTo) ||
      matchesDateRange(row.nextSampleDate, filters.dateFrom, filters.dateTo);
    if (!inRange) return false;
  }

  return true;
}

function matchesSampleFilters(sample: OilSampleRow, filters: OilReportFilters): boolean {
  if (!matchesDateRange(sample.sampledAt, filters.dateFrom, filters.dateTo)) return false;
  if (filters.lpIds && filters.lpIds.length > 0) {
    const lpId = sample.lubricationPointId?.trim() ?? '';
    if (!lpId || !filters.lpIds.includes(lpId)) return false;
  }
  if (filters.equipmentId && sample.equipmentId !== filters.equipmentId) return false;
  if (filters.area && sample.area !== filters.area) return false;
  if (filters.contractor && sample.contractorId !== filters.contractor) return false;
  if (filters.oilType) {
    const lpId = sample.lubricationPointId?.trim() ?? '';
    if (!lpId || resolveOilType(lpId) !== filters.oilType) return false;
  }
  if (filters.sampleId) {
    const q = filters.sampleId.trim().toLowerCase();
    const haystack = [sample.sampleId, sample.labSampleId, sample.id].join(' ').toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (filters.reportStatus) {
    if (resolveReportStatus(sample) !== filters.reportStatus) return false;
  }
  if (filters.equipmentStatus) {
    const cond = computeSampleCondition(sample);
    const mapped =
      cond === 'critical'
        ? 'alert'
        : cond === 'caution' || cond === 'monitor'
          ? 'caution'
          : cond === 'normal'
            ? 'normal'
            : cond === 'pending'
              ? 'pending'
              : 'none';
    if (filters.equipmentStatus === 'overdue') return false;
    if (mapped !== filters.equipmentStatus) return false;
  }
  return true;
}

function scopedSamples(
  scope: OilAnalysisContractorScope,
  filters: OilReportFilters,
): OilSampleRow[] {
  const contractorScoped = applyContractorScope(scope, filters.contractor);
  return oilSampleService.list().filter((sample) => {
    if (contractorScoped && sample.contractorId !== contractorScoped) return false;
    return matchesSampleFilters(sample, filters);
  });
}

function scopedLpRows(
  scope: OilAnalysisContractorScope,
  filters: OilReportFilters,
): ScopedLpRow[] {
  return buildScopedLpRows(scope, filters.contractor).filter((row) =>
    matchesLpFilters(row, filters),
  );
}

function isEngineeringEligible(row: OilSampleRow): boolean {
  if (!hasLabResults(row)) return false;
  return isSampleResultFinalized(row);
}

function groupBy<T>(
  rows: readonly T[],
  keyFn: (row: T) => string,
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

function isPendingReviewRow(row: OilSampleRow): boolean {
  if (row.status === 'needs-lp-mapping') return true;
  if (!row.lubricationPointId) return true;
  if (row.pdfImportStatus === 'pending-review') return true;
  if (row.status === 'imported' || row.status === 'linked' || row.status === 'pending-review') {
    return true;
  }
  return false;
}

function isPendingApprovalRow(row: OilSampleRow): boolean {
  if (!hasLabResults(row)) return false;
  if (!isApprovalWorkflowEnabled()) return false;
  return row.approvalStatus === 'pending' || row.approvalStatus === 'under-review';
}

function pendingReason(row: OilSampleRow): string {
  const reasons: string[] = [];
  if (!row.lubricationPointId) reasons.push('missing-lp');
  if (row.status === 'needs-lp-mapping') reasons.push('needs-lp-mapping');
  if (row.pdfImportStatus === 'pending-review') reasons.push('pdf-pending');
  if (row.status === 'imported' || row.status === 'linked' || row.status === 'pending-review') {
    reasons.push('intake');
  }
  if (hasLabResults(row) && row.approvalStatus === 'pending') reasons.push('pending-approval');
  if (row.approvalStatus === 'under-review') reasons.push('under-review');
  return reasons.join(', ') || row.status;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
}

function lpTableColumns(): OilReportColumn[] {
  return [
    { id: 'lpId', label: 'LP_ID' },
    { id: 'equipmentId', label: 'Equipment_ID' },
    { id: 'equipmentName', label: 'Equipment' },
    { id: 'area', label: 'Area' },
    { id: 'contractorId', label: 'Contractor' },
    { id: 'oilType', label: 'Oil Type' },
    { id: 'lastSampleDate', label: 'Last Sample' },
    { id: 'nextSampleDate', label: 'Next Sample' },
    { id: 'status', label: 'Status' },
    { id: 'reportStatus', label: 'Report Status' },
  ];
}

function lpToTableRow(row: ScopedLpRow): Record<string, string | number | null> {
  return {
    lpId: row.lpId,
    equipmentId: row.equipmentId,
    equipmentName: row.equipmentName,
    area: row.area,
    contractorId: row.contractorId,
    oilType: row.oilType,
    lastSampleDate: row.lastSampleDate ?? '—',
    nextSampleDate: row.nextSampleDate ?? '—',
    status: row.lastSampleStatus,
    reportStatus: row.reportStatus,
  };
}

function sampleTableColumns(): OilReportColumn[] {
  return [
    { id: 'sampleId', label: 'Sample ID' },
    { id: 'equipmentId', label: 'Equipment_ID' },
    { id: 'lpId', label: 'LP_ID' },
    { id: 'labSampleId', label: 'Lab Sample ID' },
    { id: 'sampledAt', label: 'Sample Date' },
    { id: 'condition', label: 'Condition' },
    { id: 'approvalStatus', label: 'Approval' },
    { id: 'contractorId', label: 'Contractor' },
  ];
}

function sampleToTableRow(row: OilSampleRow): Record<string, string | number | null> {
  return {
    sampleId: row.sampleId,
    equipmentId: row.equipmentId,
    lpId: row.lubricationPointId ?? '—',
    labSampleId: row.labSampleId,
    sampledAt: row.sampledAt,
    condition: computeSampleCondition(row),
    approvalStatus: row.approvalStatus ?? '—',
    contractorId: row.contractorId,
  };
}

function buildReference(reportType: OilReportType, generatedAt: string): string {
  const date = generatedAt.slice(0, 10).replace(/-/g, '');
  return `OA-RPT-${reportType.toUpperCase().replace(/-/g, '')}-${date}`;
}

// ── Report builders ───────────────────────────────────────────────────────────

function buildReport(
  scope: OilAnalysisContractorScope,
  filters: OilReportFilters,
): OilReportResult {
  const template = findReportTemplate(filters.reportType);
  const title = template?.labelEn ?? filters.reportType;
  const samples = scopedSamples(scope, filters);
  const lpRows = scopedLpRows(scope, filters);

  switch (filters.reportType) {
    case 'sample-summary': {
      const eligible = samples.filter(isEngineeringEligible);
      const breakdowns: OilReportBreakdown[] = [
        { title: 'By Equipment', rows: groupBy(eligible, (r) => r.equipmentId) },
        { title: 'By Area', rows: groupBy(eligible, (r) => r.area) },
        { title: 'By Contractor', rows: groupBy(eligible, (r) => r.contractorId) },
        { title: 'By Condition', rows: groupBy(eligible, (r) => computeSampleCondition(r)) },
      ];
      const byCond = breakdowns[3]!.rows;
      return {
        kind: filters.reportType,
        title,
        tableColumns: sampleTableColumns(),
        tableRows: eligible.map(sampleToTableRow),
        breakdowns,
        charts: [
          {
            title: 'Condition Distribution',
            slices: byCond.map((r) => ({
              label: r.key,
              value: r.count,
              color:
                r.key === 'critical'
                  ? '#dc2626'
                  : r.key === 'caution'
                    ? '#d97706'
                    : r.key === 'normal'
                      ? '#16a34a'
                      : '#6366f1',
            })),
          },
        ],
      };
    }

    case 'samples-by-period': {
      const eligible = samples.filter(isEngineeringEligible);
      const months = groupBy(eligible, (r) => monthKey(r.sampledAt));
      return {
        kind: filters.reportType,
        title,
        tableColumns: [
          { id: 'period', label: 'Period' },
          { id: 'count', label: 'Samples' },
        ],
        tableRows: months.map((m) => ({
          period: formatMonthLabel(m.key),
          count: m.count,
        })),
        breakdowns: [],
        charts: [
          {
            title: 'Monthly Sample Volume',
            slices: months.map((m) => ({
              label: formatMonthLabel(m.key),
              value: m.count,
            })),
          },
        ],
      };
    }

    case 'pending-reviews': {
      const pending = samples.filter(isPendingReviewRow);
      return {
        kind: filters.reportType,
        title,
        tableColumns: [
          { id: 'sampleId', label: 'Sample ID' },
          { id: 'equipmentId', label: 'Equipment_ID' },
          { id: 'lpId', label: 'LP_ID' },
          { id: 'sampledAt', label: 'Sample Date' },
          { id: 'status', label: 'Status' },
          { id: 'pendingReason', label: 'Pending Reason' },
        ],
        tableRows: pending.map((r) => ({
          sampleId: r.sampleId,
          equipmentId: r.equipmentId,
          lpId: r.lubricationPointId ?? '—',
          sampledAt: r.sampledAt,
          status: r.status,
          pendingReason: pendingReason(r),
        })),
        breakdowns: [],
        charts: [],
      };
    }

    case 'pending-approvals': {
      const pending = samples.filter(isPendingApprovalRow);
      return {
        kind: filters.reportType,
        title,
        tableColumns: [
          { id: 'sampleId', label: 'Sample ID' },
          { id: 'equipmentId', label: 'Equipment_ID' },
          { id: 'lpId', label: 'LP_ID' },
          { id: 'sampledAt', label: 'Sample Date' },
          { id: 'condition', label: 'Condition' },
          { id: 'approvalStatus', label: 'Approval Status' },
        ],
        tableRows: pending.map((r) => ({
          sampleId: r.sampleId,
          equipmentId: r.equipmentId,
          lpId: r.lubricationPointId ?? '—',
          sampledAt: r.sampledAt,
          condition: computeSampleCondition(r),
          approvalStatus: r.approvalStatus ?? '—',
        })),
        breakdowns: [],
        charts: [],
      };
    }

    case 'alert-equipment':
    case 'caution-equipment':
    case 'normal-equipment': {
      const statusMap: Record<string, LpRegisterConditionStatus> = {
        'alert-equipment': 'alert',
        'caution-equipment': 'caution',
        'normal-equipment': 'normal',
      };
      const target = statusMap[filters.reportType]!;
      const filtered = lpRows.filter((r) => r.lastSampleStatus === target);
      return {
        kind: filters.reportType,
        title,
        tableColumns: lpTableColumns(),
        tableRows: filtered.map(lpToTableRow),
        breakdowns: [
          { title: 'By Area', rows: groupBy(filtered, (r) => r.area) },
          { title: 'By Contractor', rows: groupBy(filtered, (r) => r.contractorId) },
        ],
        charts: [],
      };
    }

    case 'critical-equipment': {
      const criticalSamples = samples.filter(
        (s) => isEngineeringEligible(s) && computeSampleCondition(s) === 'critical',
      );
      const equipmentIds = new Set(criticalSamples.map((s) => s.equipmentId));
      const filtered = lpRows.filter(
        (r) =>
          equipmentIds.has(r.equipmentId) ||
          r.lastSampleStatus === 'alert' ||
          (r.latestSample !== null &&
            computeSampleCondition(r.latestSample) === 'critical'),
      );
      return {
        kind: filters.reportType,
        title,
        tableColumns: lpTableColumns(),
        tableRows: filtered.map(lpToTableRow),
        breakdowns: [],
        charts: [],
      };
    }

    case 'equipment-history': {
      const eligible = samples
        .filter(isEngineeringEligible)
        .sort((a, b) => b.sampledAt.localeCompare(a.sampledAt));
      return {
        kind: filters.reportType,
        title,
        tableColumns: sampleTableColumns(),
        tableRows: eligible.map(sampleToTableRow),
        breakdowns: [
          { title: 'By Equipment', rows: groupBy(eligible, (r) => r.equipmentId) },
        ],
        charts: [],
      };
    }

    case 'lp-history': {
      const eligible = samples
        .filter((s) => isEngineeringEligible(s) && Boolean(s.lubricationPointId))
        .sort((a, b) => b.sampledAt.localeCompare(a.sampledAt));
      return {
        kind: filters.reportType,
        title,
        tableColumns: sampleTableColumns(),
        tableRows: eligible.map(sampleToTableRow),
        breakdowns: [
          { title: 'By LP', rows: groupBy(eligible, (r) => r.lubricationPointId ?? '—') },
        ],
        charts: [],
      };
    }

    case 'oil-type-history': {
      const eligible = samples.filter(isEngineeringEligible);
      const withOil = eligible.map((s) => ({
        sample: s,
        oilType: s.lubricationPointId ? resolveOilType(s.lubricationPointId) : s.lubricant || '—',
      }));
      return {
        kind: filters.reportType,
        title,
        tableColumns: [
          ...sampleTableColumns(),
          { id: 'oilType', label: 'Oil Type' },
        ],
        tableRows: withOil.map(({ sample, oilType }) => ({
          ...sampleToTableRow(sample),
          oilType,
        })),
        breakdowns: [
          { title: 'By Oil Type', rows: groupBy(withOil, (r) => r.oilType) },
        ],
        charts: [
          {
            title: 'Oil Type Distribution',
            slices: groupBy(withOil, (r) => r.oilType).map((r) => ({
              label: r.key,
              value: r.count,
            })),
          },
        ],
      };
    }

    case 'contractor-performance': {
      const byContractor = groupBy(lpRows, (r) => r.contractorId);
      return {
        kind: filters.reportType,
        title,
        tableColumns: [
          { id: 'contractorId', label: 'Contractor' },
          { id: 'totalLps', label: 'Total LPs' },
          { id: 'alert', label: 'Alert' },
          { id: 'caution', label: 'Caution' },
          { id: 'normal', label: 'Normal' },
          { id: 'overdue', label: 'Overdue' },
          { id: 'compliancePct', label: 'Compliance %' },
        ],
        tableRows: byContractor.map((g) => {
          const rows = lpRows.filter((r) => r.contractorId === g.key);
          const overdue = rows.filter((r) => r.isSampleOverdue).length;
          const compliant = rows.length - overdue;
          return {
            contractorId: g.key,
            totalLps: rows.length,
            alert: rows.filter((r) => r.lastSampleStatus === 'alert').length,
            caution: rows.filter((r) => r.lastSampleStatus === 'caution').length,
            normal: rows.filter((r) => r.lastSampleStatus === 'normal').length,
            overdue,
            compliancePct: rows.length > 0 ? Math.round((compliant / rows.length) * 100) : 0,
          };
        }),
        breakdowns: [],
        charts: [],
      };
    }

    case 'kpi-summary': {
      const kpis = computeScopedKpis(lpRows);
      return {
        kind: filters.reportType,
        title,
        tableColumns: [
          { id: 'metric', label: 'Metric' },
          { id: 'value', label: 'Value' },
        ],
        tableRows: [
          { metric: 'Total LPs', value: kpis.total },
          { metric: 'Normal', value: kpis.normal },
          { metric: 'Caution', value: kpis.caution },
          { metric: 'Alert', value: kpis.alert },
          { metric: 'Pending', value: kpis.pending },
          { metric: 'No Sample', value: kpis.noSample },
          { metric: 'Overdue Sampling', value: kpis.overdue },
        ],
        breakdowns: [],
        charts: [
          {
            title: 'Equipment Health',
            slices: [
              { label: 'Alert', value: kpis.alert, color: '#dc2626' },
              { label: 'Caution', value: kpis.caution, color: '#d97706' },
              { label: 'Normal', value: kpis.normal, color: '#16a34a' },
              { label: 'Pending', value: kpis.pending, color: '#6366f1' },
              { label: 'No sample', value: kpis.noSample, color: '#94a3b8' },
            ],
          },
        ],
      };
    }

    case 'monthly-summary': {
      const eligible = samples.filter(isEngineeringEligible);
      const months = groupBy(eligible, (r) => monthKey(r.sampledAt));
      return {
        kind: filters.reportType,
        title,
        tableColumns: [
          { id: 'period', label: 'Month' },
          { id: 'samples', label: 'Samples' },
          { id: 'critical', label: 'Critical' },
          { id: 'caution', label: 'Caution' },
        ],
        tableRows: months.map((m) => {
          const monthSamples = eligible.filter((s) => monthKey(s.sampledAt) === m.key);
          return {
            period: formatMonthLabel(m.key),
            samples: m.count,
            critical: monthSamples.filter((s) => computeSampleCondition(s) === 'critical').length,
            caution: monthSamples.filter(
              (s) => {
                const c = computeSampleCondition(s);
                return c === 'caution' || c === 'monitor';
              },
            ).length,
          };
        }),
        breakdowns: [],
        charts: [
          {
            title: 'Monthly Samples',
            slices: months.map((m) => ({ label: formatMonthLabel(m.key), value: m.count })),
          },
        ],
      };
    }

    case 'area-summary': {
      const byArea = groupBy(lpRows, (r) => r.area);
      return {
        kind: filters.reportType,
        title,
        tableColumns: [
          { id: 'area', label: 'Area' },
          { id: 'totalLps', label: 'Total LPs' },
          { id: 'alert', label: 'Alert' },
          { id: 'caution', label: 'Caution' },
          { id: 'normal', label: 'Normal' },
          { id: 'overdue', label: 'Overdue' },
        ],
        tableRows: byArea.map((g) => {
          const rows = lpRows.filter((r) => r.area === g.key);
          return {
            area: g.key,
            totalLps: rows.length,
            alert: rows.filter((r) => r.lastSampleStatus === 'alert').length,
            caution: rows.filter((r) => r.lastSampleStatus === 'caution').length,
            normal: rows.filter((r) => r.lastSampleStatus === 'normal').length,
            overdue: rows.filter((r) => r.isSampleOverdue).length,
          };
        }),
        breakdowns: [],
        charts: [
          {
            title: 'LPs by Area',
            slices: byArea.map((r) => ({ label: r.key, value: r.count })),
          },
        ],
      };
    }

    case 'contractor-comparison': {
      if (!scope.canViewAllContractors) {
        return {
          kind: filters.reportType,
          title,
          tableColumns: [],
          tableRows: [],
          breakdowns: [],
          charts: [],
        };
      }
      const contractors = distinctSorted(lpRows.map((r) => r.contractorId));
      return {
        kind: filters.reportType,
        title,
        tableColumns: [
          { id: 'contractorId', label: 'Contractor' },
          { id: 'alert', label: 'Alert' },
          { id: 'caution', label: 'Caution' },
          { id: 'normal', label: 'Normal' },
          { id: 'overdue', label: 'Overdue' },
        ],
        tableRows: contractors.map((contractorId) => {
          const rows = lpRows.filter((r) => r.contractorId === contractorId);
          return {
            contractorId,
            alert: rows.filter((r) => r.lastSampleStatus === 'alert').length,
            caution: rows.filter((r) => r.lastSampleStatus === 'caution').length,
            normal: rows.filter((r) => r.lastSampleStatus === 'normal').length,
            overdue: rows.filter((r) => r.isSampleOverdue).length,
          };
        }),
        breakdowns: [],
        charts: contractors.map((contractorId) => {
          const rows = lpRows.filter((r) => r.contractorId === contractorId);
          return {
            title: contractorId,
            slices: [
              { label: 'Alert', value: rows.filter((r) => r.lastSampleStatus === 'alert').length, color: '#dc2626' },
              { label: 'Caution', value: rows.filter((r) => r.lastSampleStatus === 'caution').length, color: '#d97706' },
              { label: 'Normal', value: rows.filter((r) => r.lastSampleStatus === 'normal').length, color: '#16a34a' },
            ],
          };
        }),
      };
    }

    case 'sampling-compliance': {
      const compliant = lpRows.filter((r) => !r.isSampleOverdue && r.lastSampleDate);
      return {
        kind: filters.reportType,
        title,
        tableColumns: lpTableColumns(),
        tableRows: compliant.map(lpToTableRow),
        breakdowns: [
          { title: 'By Contractor', rows: groupBy(compliant, (r) => r.contractorId) },
        ],
        charts: [],
      };
    }

    case 'overdue-sampling': {
      const overdue = lpRows.filter((r) => r.isSampleOverdue);
      return {
        kind: filters.reportType,
        title,
        tableColumns: lpTableColumns(),
        tableRows: overdue.map(lpToTableRow),
        breakdowns: [
          { title: 'By Area', rows: groupBy(overdue, (r) => r.area) },
        ],
        charts: [
          {
            title: 'Overdue by Area',
            slices: groupBy(overdue, (r) => r.area).map((r) => ({
              label: r.key,
              value: r.count,
              color: '#ca8a04',
            })),
          },
        ],
      };
    }

    case 'oil-change-compliance': {
      const contractorScoped = applyContractorScope(scope, filters.contractor);
      const tasks = oilChangeService.listTasks().filter((task) => {
        if (contractorScoped && task.contractorId !== contractorScoped) return false;
        if (filters.area && task.area !== filters.area) return false;
        if (filters.equipmentId && task.equipmentId !== filters.equipmentId) return false;
        if (filters.lpIds && filters.lpIds.length > 0 && !filters.lpIds.includes(task.lpId)) {
          return false;
        }
        return true;
      });

      const taskRow = (task: OcTask): Record<string, string | number | null> => ({
        lpId: task.lpId,
        equipmentId: task.equipmentId,
        equipmentName: task.equipmentName,
        area: task.area,
        contractorId: task.contractorId,
        oilType: task.oilType,
        status: task.status,
        dueDate: task.dueDate ?? '—',
        lastChangeDate: task.lastChangeDate ?? '—',
      });

      return {
        kind: filters.reportType,
        title,
        tableColumns: [
          { id: 'lpId', label: 'LP_ID' },
          { id: 'equipmentId', label: 'Equipment_ID' },
          { id: 'equipmentName', label: 'Equipment' },
          { id: 'area', label: 'Area' },
          { id: 'contractorId', label: 'Contractor' },
          { id: 'oilType', label: 'Oil Type' },
          { id: 'status', label: 'Status' },
          { id: 'dueDate', label: 'Due Date' },
          { id: 'lastChangeDate', label: 'Last Change' },
        ],
        tableRows: tasks.map(taskRow),
        breakdowns: [
          { title: 'By Status', rows: groupBy(tasks, (t) => t.status) },
        ],
        charts: [
          {
            title: 'Oil Change Status',
            slices: groupBy(tasks, (t) => t.status).map((r) => ({
              label: r.key,
              value: r.count,
            })),
          },
        ],
      };
    }

    case 'missing-samples': {
      const missing = lpRows.filter((r) => r.lastSampleStatus === 'none');
      return {
        kind: filters.reportType,
        title,
        tableColumns: lpTableColumns(),
        tableRows: missing.map(lpToTableRow),
        breakdowns: [
          { title: 'By Area', rows: groupBy(missing, (r) => r.area) },
          { title: 'By Contractor', rows: groupBy(missing, (r) => r.contractorId) },
        ],
        charts: [],
      };
    }

    default:
      return {
        kind: filters.reportType,
        title,
        tableColumns: [],
        tableRows: [],
        breakdowns: [],
        charts: [],
      };
  }
}

function buildKpis(report: OilReportResult): readonly OilReportKpis[] {
  const rowCount = report.tableRows.length;
  switch (report.kind) {
    case 'sample-summary':
      return [
        { label: 'samples', value: rowCount },
        { label: 'breakdowns', value: report.breakdowns.length },
      ];
    case 'pending-reviews':
      return [{ label: 'pending', value: rowCount }];
    case 'pending-approvals':
      return [{ label: 'pending-approval', value: rowCount }];
    case 'kpi-summary':
      return report.tableRows.map((r) => ({
        label: String(r.metric ?? ''),
        value: Number(r.value ?? 0),
      }));
    case 'overdue-sampling':
      return [{ label: 'overdue', value: rowCount }];
    case 'missing-samples':
      return [{ label: 'missing', value: rowCount }];
    case 'contractor-comparison':
      return [{ label: 'contractors', value: rowCount }];
    default:
      return [{ label: 'records', value: rowCount }];
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

function dataRevisionToken(): string {
  return oilSampleService.list().map((s) => `${s.id}:${s.updatedAt}`).join('|');
}

function cacheKey(scope: OilAnalysisContractorScope, filters: OilReportFilters): string {
  return JSON.stringify({
    scope: scope.lockedContractorId,
    all: scope.canViewAllContractors,
    filters,
    rev: dataRevisionToken(),
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getReportFilterOptions(
  scope: OilAnalysisContractorScope,
): OilReportFilterOptions {
  const lpRows = buildScopedLpRows(scope);
  const samples = scopedSamples(scope, { reportType: 'sample-summary' });

  return {
    lpIds: distinctSorted(lpRows.map((r) => r.lpId)),
    equipmentIds: distinctSorted(lpRows.map((r) => r.equipmentId)),
    areas: distinctSorted(lpRows.map((r) => r.area)),
    contractors: distinctSorted(lpRows.map((r) => r.contractorId)),
    oilTypes: distinctSorted(lpRows.map((r) => r.oilType)),
    reportStatuses: distinctSorted(samples.map((s) => resolveReportStatus(s))),
    equipmentStatuses: ['normal', 'caution', 'alert', 'pending', 'none', 'overdue'],
  };
}

/** @deprecated Use getReportFilterOptions(scope).areas */
export function listReportAreas(scope: OilAnalysisContractorScope): string[] {
  return [...getReportFilterOptions(scope).areas];
}

/** @deprecated Use getReportFilterOptions(scope).contractors */
export function listReportContractors(scope: OilAnalysisContractorScope): string[] {
  return [...getReportFilterOptions(scope).contractors];
}

export function generateOilReport(
  scope: OilAnalysisContractorScope,
  filters: OilReportFilters,
): OilReportOutput {
  const key = cacheKey(scope, filters);
  const cached = reportCache.get(key);
  if (cached) return cached;

  const generatedAt = new Date().toISOString();
  const report = buildReport(scope, filters);
  const output: OilReportOutput = {
    filters,
    kpis: buildKpis(report),
    report,
    generatedAt,
    reference: buildReference(filters.reportType, generatedAt),
  };

  reportCache.set(key, output);
  return output;
}

export function hasReportData(output: OilReportOutput): boolean {
  const { report } = output;
  return (
    report.tableRows.length > 0 ||
    report.breakdowns.some((b) => b.rows.length > 0) ||
    report.charts.some((c) => c.slices.some((s) => s.value > 0))
  );
}

export type { SampleCondition };
