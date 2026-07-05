// apps/owner-center/src/modules/oil-analysis/dashboard.service.ts
// OA-006 Dashboard — contractor-scoped operational aggregates.
// Industrial control-center redesign: KPI command strip, Critical Equipment
// table, Today Action Queue, Review/Approval Queue, Sampling Forecast,
// Contractor Comparison, single consolidated Recent Activity feed.
// Charts limited to Equipment Health + Sample Trend (each answers a decision
// question) — Oil Type Distribution dropped (informational only).

import { getPlatformSdk } from '../platform/platform-master-access';
import type { OilAnalysisContractorScope } from './contractor-scope';
import {
  lpRegisterService,
  registerStatusBadge,
  type LpRegisterConditionStatus,
} from './lp-register.service';
import {
  oilSampleService,
  computeSampleCondition,
  hasLabResults,
  type OilSampleRow,
} from './sample.service';
import { oilChangeService } from '../oil-lubrication/oil-change.service';
import type { OcRecord } from '../oil-lubrication/oil-change.service';
import { isApprovalWorkflowEnabled } from './approval-workflow';
import { oilAnalysisActionsService } from './actions.service';
import { engineeringActionService } from '../platform/engineering-actions/engineering-action.service';

export interface DashboardFilterParams {
  readonly search?: string;
  readonly lpId?: string;
  readonly area?: string;
  readonly contractor?: string;
  readonly oilType?: string;
  readonly status?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

export interface DashboardFilterOptions {
  readonly lpIds: readonly string[];
  readonly areas: readonly string[];
  readonly contractors: readonly string[];
  readonly oilTypes: readonly string[];
}

/** Exactly the 9 approved KPI cards — see 090_OIL_ANALYSIS_UI_FREEZE_v1.0.md OA-006. */
export interface DashboardKpis {
  readonly totalLpsWithSampling: number;
  readonly alertEquipment: number;
  readonly cautionEquipment: number;
  readonly normalEquipment: number;
  readonly samplesDueToday: number;
  readonly overdueSamples: number;
  readonly pendingReview: number;
  readonly pendingApproval: number;
  readonly openActions: number;
}

export interface DashboardLpRow {
  readonly id: string;
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
  readonly lastAction: string;
  readonly assignedTo: string;
}

/** Critical Equipment table row. */
export interface CriticalEquipmentRow {
  readonly id: string;
  readonly lpId: string;
  readonly equipmentId: string;
  readonly equipmentName: string;
  readonly area: string;
  readonly contractorId: string;
  readonly reportStatus: string;
  readonly lastAction: string;
  readonly assignedTo: string;
  readonly reason: 'alert' | 'caution' | 'overdue' | 'shutdown';
}

/** Compact stat-strip item (Review / Approval Queue). */
export interface ReviewQueueItem {
  readonly id: string;
  readonly label: string;
  readonly count: number;
  readonly route: string;
}

/** Today Action Queue item. */
export interface ActionQueueItem {
  readonly id: string;
  readonly title: string;
  readonly count: number;
  readonly route: string;
}

/** Forward-looking sampling load — cumulative LPs due within each window. */
export interface SamplingForecast {
  readonly due30: number;
  readonly due60: number;
  readonly due90: number;
}

export interface RecentActivityItem {
  readonly id: string;
  readonly kind: 'sample' | 'action' | 'oil-change' | 'comment';
  readonly title: string;
  readonly subtitle: string;
  readonly isoDate: string;
  readonly route?: string;
}

export interface HealthDistributionSlice {
  readonly status: LpRegisterConditionStatus | 'overdue';
  readonly count: number;
}

export interface MonthlySamplePoint {
  readonly month: string;
  readonly label: string;
  readonly count: number;
}

export interface ContractorComparisonBar {
  readonly contractorId: string;
  readonly alert: number;
  readonly caution: number;
  readonly normal: number;
}

export interface DashboardCharts {
  readonly healthDistribution: readonly HealthDistributionSlice[];
  readonly monthlySampleTrend: readonly MonthlySamplePoint[];
  readonly contractorComparison: readonly ContractorComparisonBar[];
}

export interface DashboardView {
  readonly kpis: DashboardKpis;
  readonly criticalEquipment: readonly CriticalEquipmentRow[];
  readonly todayActionQueue: readonly ActionQueueItem[];
  readonly reviewQueue: readonly ReviewQueueItem[];
  readonly samplingForecast: SamplingForecast;
  readonly recentActivity: readonly RecentActivityItem[];
  readonly charts: DashboardCharts;
}

const STATUS_RANK: Record<LpRegisterConditionStatus, number> = {
  none: 0,
  pending: 1,
  normal: 2,
  caution: 3,
  alert: 4,
};

const CRITICAL_RANK: Record<CriticalEquipmentRow['reason'], number> = {
  shutdown: 0,
  alert: 1,
  caution: 2,
  overdue: 3,
};

function distinctSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function applyContractorScope(
  scope: OilAnalysisContractorScope,
  contractorFilter?: string,
): string | undefined {
  if (!scope.canViewAllContractors) return scope.lockedContractorId;
  return contractorFilter?.trim() || undefined;
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

function assignedToByLp(): Map<string, string> {
  const map = new Map<string, string>();
  for (const action of engineeringActionService.listLatestByLp({ source: 'Oil Analysis' })) {
    if (action.lpId) map.set(action.lpId, action.assignedTo?.trim() || '—');
  }
  return map;
}

function resolveLastAction(sample: OilSampleRow | null): string {
  if (!sample) return '—';
  const alert = sample.alertType.trim();
  if (alert) return alert;
  const analysis = sample.sampleAnalysis.trim();
  if (analysis) return analysis.slice(0, 80);
  return '—';
}

function matchesSearch(row: DashboardLpRow, query: string): boolean {
  const haystack = [
    row.lpId,
    row.equipmentId,
    row.equipmentName,
    row.area,
    row.contractorId,
    row.oilType,
    row.reportStatus,
    row.lastAction,
  ].join(' ').toLowerCase();
  return haystack.includes(query);
}

function dateInRange(iso: string | null, from?: string, to?: string): boolean {
  if (!iso) return false;
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
}

function matchesDateFilter(row: DashboardLpRow, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  return (
    dateInRange(row.lastSampleDate, from, to) ||
    dateInRange(row.nextSampleDate, from, to)
  );
}

function matchesFilters(row: DashboardLpRow, params: DashboardFilterParams): boolean {
  const search = params.search?.trim().toLowerCase() ?? '';
  if (search && !matchesSearch(row, search)) return false;
  if (params.lpId && row.lpId !== params.lpId) return false;
  if (params.area && row.area !== params.area) return false;
  if (params.oilType && row.oilType !== params.oilType) return false;
  if (!matchesDateFilter(row, params.dateFrom, params.dateTo)) return false;

  if (params.status) {
    if (params.status === 'overdue') {
      if (!row.isSampleOverdue) return false;
    } else if (row.lastSampleStatus !== params.status) {
      return false;
    }
  }

  return true;
}

function worstStatus(statuses: readonly LpRegisterConditionStatus[]): LpRegisterConditionStatus {
  return statuses.reduce(
    (worst, current) => (STATUS_RANK[current] > STATUS_RANK[worst] ? current : worst),
    'none',
  );
}

function equipmentHealthCounts(rows: readonly DashboardLpRow[]): {
  alert: number;
  caution: number;
  normal: number;
} {
  const byEquipment = new Map<string, LpRegisterConditionStatus[]>();
  for (const row of rows) {
    const list = byEquipment.get(row.equipmentId) ?? [];
    list.push(row.lastSampleStatus);
    byEquipment.set(row.equipmentId, list);
  }

  let alert = 0;
  let caution = 0;
  let normal = 0;
  for (const statuses of byEquipment.values()) {
    const worst = worstStatus(statuses);
    if (worst === 'alert') alert += 1;
    else if (worst === 'caution') caution += 1;
    else if (worst === 'normal') normal += 1;
  }
  return { alert, caution, normal };
}

function buildEnrichedRows(
  scope: OilAnalysisContractorScope,
  contractorFilter?: string,
): DashboardLpRow[] {
  const samples = oilSampleService.list();
  const latestByLp = latestSampleByLp(samples);
  const assignees = assignedToByLp();
  const baseRows = lpRegisterService.buildRows(scope);

  return baseRows
    .filter((row) => !contractorFilter || row.contractorId === contractorFilter)
    .map((row) => {
      const sample = latestByLp.get(row.lpId) ?? null;
      return {
        id: row.id,
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
        lastAction: resolveLastAction(sample),
        assignedTo: assignees.get(row.lpId) ?? '—',
      };
    });
}

function scopedSamples(
  scope: OilAnalysisContractorScope,
  contractorFilter?: string,
  lpIds?: Set<string>,
): OilSampleRow[] {
  return oilSampleService.list().filter((sample) => {
    if (contractorFilter && sample.contractorId !== contractorFilter) return false;
    if (lpIds && sample.lubricationPointId && !lpIds.has(sample.lubricationPointId)) {
      return false;
    }
    return true;
  });
}

function buildCriticalEquipment(rows: readonly DashboardLpRow[]): CriticalEquipmentRow[] {
  const items: CriticalEquipmentRow[] = [];

  for (const row of rows) {
    const sample = oilSampleService
      .list()
      .filter((s) => s.lubricationPointId === row.lpId)
      .sort((a, b) => b.sampledAt.localeCompare(a.sampledAt))[0] ?? null;

    const shutdown =
      sample !== null &&
      computeSampleCondition(sample) === 'critical' &&
      /shutdown/i.test(sample.alertType);

    let reason: CriticalEquipmentRow['reason'] | null = null;
    if (row.lastSampleStatus === 'alert') reason = shutdown ? 'shutdown' : 'alert';
    else if (row.lastSampleStatus === 'caution') reason = 'caution';
    else if (row.isSampleOverdue) reason = 'overdue';
    else if (shutdown) reason = 'shutdown';

    if (!reason) continue;

    items.push({
      id: `${row.id}-${reason}`,
      lpId: row.lpId,
      equipmentId: row.equipmentId,
      equipmentName: row.equipmentName,
      area: row.area,
      contractorId: row.contractorId,
      reportStatus: row.reportStatus,
      lastAction: row.lastAction,
      assignedTo: row.assignedTo,
      reason,
    });
  }

  return items.sort(
    (a, b) => CRITICAL_RANK[a.reason] - CRITICAL_RANK[b.reason] || a.lpId.localeCompare(b.lpId),
  );
}

function buildReviewQueue(
  samples: readonly OilSampleRow[],
  openContractorActions: number,
): ReviewQueueItem[] {
  const pdfQueue = samples.filter((s) => s.pdfImportStatus === 'pending-review').length;
  const pendingReview = samples.filter(
    (s) =>
      s.status === 'pending-review' ||
      s.status === 'imported' ||
      s.status === 'linked' ||
      s.status === 'needs-lp-mapping',
  ).length;
  const pendingApproval = isApprovalWorkflowEnabled()
    ? samples.filter(
        (s) =>
          hasLabResults(s) &&
          (s.approvalStatus === 'pending' || s.approvalStatus === 'under-review'),
      ).length
    : 0;

  const items: ReviewQueueItem[] = [
    { id: 'pdf-queue', label: 'PDF', count: pdfQueue, route: '/oil-analysis/add-sample' },
    { id: 'pending-review', label: 'Rev', count: pendingReview, route: '/oil-analysis/samples' },
  ];

  if (isApprovalWorkflowEnabled()) {
    items.push({ id: 'pending-approval', label: 'Appr', count: pendingApproval, route: '/oil-analysis/review' });
  }

  items.push({ id: 'contractor-actions', label: 'Ctr', count: openContractorActions, route: '/oil-analysis/actions' });

  return items;
}

function buildTodayActionQueue(
  kpis: Pick<DashboardKpis, 'overdueSamples' | 'pendingApproval'>,
  pdfPendingReview: number,
  openContractorActions: number,
): ActionQueueItem[] {
  const items: ActionQueueItem[] = [];

  if (pdfPendingReview > 0) {
    items.push({
      id: 'action-pdf-review',
      title: `Review ${pdfPendingReview} PDF import(s)`,
      count: pdfPendingReview,
      route: '/oil-analysis/add-sample',
    });
  }
  if (isApprovalWorkflowEnabled() && kpis.pendingApproval > 0) {
    items.push({
      id: 'action-pending-approval',
      title: `Approve ${kpis.pendingApproval} pending sample(s)`,
      count: kpis.pendingApproval,
      route: '/oil-analysis/review',
    });
  }
  if (kpis.overdueSamples > 0) {
    items.push({
      id: 'action-overdue',
      title: `Resample ${kpis.overdueSamples} overdue LP(s)`,
      count: kpis.overdueSamples,
      route: '/oil-analysis/register',
    });
  }
  if (openContractorActions > 0) {
    items.push({
      id: 'action-contractor-actions',
      title: `Close ${openContractorActions} contractor action(s)`,
      count: openContractorActions,
      route: '/oil-analysis/actions',
    });
  }

  return items;
}

/** Cumulative count of in-scope LPs whose next sample is due within 30/60/90 days. */
function buildSamplingForecast(rows: readonly DashboardLpRow[], today: string): SamplingForecast {
  const d30 = addDays(today, 30);
  const d60 = addDays(today, 60);
  const d90 = addDays(today, 90);

  const dueDates = rows
    .map((r) => r.nextSampleDate)
    .filter((d): d is string => d !== null && d >= today);

  return {
    due30: dueDates.filter((d) => d <= d30).length,
    due60: dueDates.filter((d) => d <= d60).length,
    due90: dueDates.filter((d) => d <= d90).length,
  };
}

/** Single consolidated, chronologically-sorted activity feed (dense — capped to 8 rows). */
function buildRecentActivity(
  samples: readonly OilSampleRow[],
  records: readonly OcRecord[],
  contractorFilter?: string,
): RecentActivityItem[] {
  const items: RecentActivityItem[] = [];

  for (const sample of [...samples]
    .filter((s) => s.importSource === 'pdf-import' || s.status === 'imported')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4)) {
    items.push({
      id: `sample-${sample.id}`,
      kind: 'sample',
      title: sample.sampleId,
      subtitle: `${sample.equipmentId} · ${sample.labSampleId}`,
      isoDate: sample.createdAt.slice(0, 10),
      route: '/oil-analysis/add-sample',
    });
  }

  for (const sample of samples.filter((s) => s.alertType.trim().length > 0).slice(0, 3)) {
    items.push({
      id: `action-${sample.id}`,
      kind: 'action',
      title: sample.alertType.trim(),
      subtitle: `${sample.lubricationPointId ?? sample.equipmentId} · ${sample.sampleId}`,
      isoDate: sample.updatedAt.slice(0, 10),
      route: '/oil-analysis/actions',
    });
  }

  for (const record of [...records]
    .filter((r) => {
      if (!contractorFilter) return true;
      const task = oilChangeService.listTasks().find((t) => t.lpId === r.lpId);
      return task?.contractorId === contractorFilter;
    })
    .filter((r) => r.status !== 'cancelled')
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt))
    .slice(0, 3)) {
    items.push({
      id: `oc-${record.id}`,
      kind: 'oil-change',
      title: record.lpId,
      subtitle: `${record.oilTypeUsed} · ${record.technicianName}`,
      isoDate: record.performedAt,
    });
  }

  for (const sample of samples) {
    for (const entry of sample.approvalHistory) {
      if (!entry.notes?.trim()) continue;
      items.push({
        id: `comment-${sample.id}-${entry.at}`,
        kind: 'comment',
        title: entry.notes.trim(),
        subtitle: `${sample.sampleId} · ${entry.actor}`,
        isoDate: entry.at.slice(0, 10),
      });
    }
  }

  return items
    .sort((a, b) => b.isoDate.localeCompare(a.isoDate))
    .slice(0, 8);
}

function buildHealthDistribution(rows: readonly DashboardLpRow[]): HealthDistributionSlice[] {
  const counts: Record<string, number> = {
    normal: 0,
    caution: 0,
    alert: 0,
    pending: 0,
    none: 0,
    overdue: 0,
  };

  for (const row of rows) {
    if (row.isSampleOverdue) {
      counts.overdue += 1;
    } else {
      counts[row.lastSampleStatus] = (counts[row.lastSampleStatus] ?? 0) + 1;
    }
  }

  return (['alert', 'caution', 'overdue', 'pending', 'normal', 'none'] as const)
    .map((status) => ({ status, count: counts[status] ?? 0 }))
    .filter((slice) => slice.count > 0);
}

function buildMonthlyTrend(samples: readonly OilSampleRow[]): MonthlySamplePoint[] {
  const today = new Date();
  const points: MonthlySamplePoint[] = [];

  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    const count = samples.filter((s) => s.sampledAt.startsWith(ym)).length;
    points.push({ month: ym, label, count });
  }

  return points;
}

function buildContractorComparison(rows: readonly DashboardLpRow[]): ContractorComparisonBar[] {
  const contractors = distinctSorted(rows.map((r) => r.contractorId));
  return contractors.map((contractorId) => {
    const subset = rows.filter((r) => r.contractorId === contractorId);
    return {
      contractorId,
      alert: subset.filter((r) => r.lastSampleStatus === 'alert').length,
      caution: subset.filter((r) => r.lastSampleStatus === 'caution').length,
      normal: subset.filter((r) => r.lastSampleStatus === 'normal').length,
    };
  });
}

export class OilAnalysisDashboardService {
  getFilterOptions(scope: OilAnalysisContractorScope): DashboardFilterOptions {
    const rows = buildEnrichedRows(scope);
    return {
      lpIds: distinctSorted(rows.map((r) => r.lpId)),
      areas: distinctSorted(rows.map((r) => r.area)),
      contractors: distinctSorted(rows.map((r) => r.contractorId)),
      oilTypes: distinctSorted(rows.map((r) => r.oilType).filter((v) => v !== '—')),
    };
  }

  load(
    scope: OilAnalysisContractorScope,
    params: DashboardFilterParams = {},
  ): DashboardView {
    const contractorFilter = applyContractorScope(scope, params.contractor);
    const allRows = buildEnrichedRows(scope, contractorFilter);
    const rows = allRows.filter((row) => matchesFilters(row, params));
    const lpIdSet = new Set(rows.map((r) => r.lpId));
    const samples = scopedSamples(scope, contractorFilter, lpIdSet);
    const today = todayDateString();

    const equipmentCounts = equipmentHealthCounts(rows);
    const pdfPendingReview = samples.filter((s) => s.pdfImportStatus === 'pending-review').length;

    const pendingReview = samples.filter(
      (s) =>
        s.status === 'pending-review' ||
        s.status === 'imported' ||
        s.status === 'linked' ||
        s.status === 'needs-lp-mapping',
    ).length;

    const pendingApproval = isApprovalWorkflowEnabled()
      ? samples.filter(
          (s) =>
            hasLabResults(s) &&
            (s.approvalStatus === 'pending' || s.approvalStatus === 'under-review'),
        ).length
      : 0;

    const openActions = oilAnalysisActionsService.countOpen(scope);
    const openContractorActions = scope.canViewAllContractors
      ? engineeringActionService
          .list({ source: 'Oil Analysis' })
          .filter((a) => a.fastActionPendingAccReview).length
      : 0;

    const kpis: DashboardKpis = {
      totalLpsWithSampling: rows.filter((r) => r.lastSampleStatus !== 'none').length,
      alertEquipment: equipmentCounts.alert,
      cautionEquipment: equipmentCounts.caution,
      normalEquipment: equipmentCounts.normal,
      samplesDueToday: rows.filter((r) => r.nextSampleDate === today).length,
      overdueSamples: rows.filter((r) => r.isSampleOverdue).length,
      pendingReview,
      pendingApproval,
      openActions,
    };

    const ocRecords = oilChangeService
      .listRecords()
      .filter((r) => {
        if (contractorFilter) {
          const task = oilChangeService.listTasks().find((t) => t.lpId === r.lpId);
          if (task && task.contractorId !== contractorFilter) return false;
        }
        return lpIdSet.has(r.lpId);
      });

    return {
      kpis,
      criticalEquipment: buildCriticalEquipment(rows),
      todayActionQueue: buildTodayActionQueue(
        { overdueSamples: kpis.overdueSamples, pendingApproval: kpis.pendingApproval },
        pdfPendingReview,
        openContractorActions,
      ),
      reviewQueue: buildReviewQueue(samples, openContractorActions),
      samplingForecast: buildSamplingForecast(rows, today),
      recentActivity: buildRecentActivity(samples, ocRecords, contractorFilter),
      charts: {
        healthDistribution: buildHealthDistribution(rows),
        monthlySampleTrend: buildMonthlyTrend(samples),
        contractorComparison: scope.canViewAllContractors
          ? buildContractorComparison(rows)
          : buildContractorComparison(rows.filter((r) => r.contractorId === contractorFilter)),
      },
    };
  }
}

export const oilAnalysisDashboardService = new OilAnalysisDashboardService();

export function dashboardStatusBadge(
  status: LpRegisterConditionStatus,
): { variant: 'normal' | 'caution' | 'alert' | 'pending-review' | 'disabled'; label: string } {
  return registerStatusBadge(status);
}
