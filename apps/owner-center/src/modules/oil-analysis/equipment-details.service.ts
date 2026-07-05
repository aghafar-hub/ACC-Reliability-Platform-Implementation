// apps/owner-center/src/modules/oil-analysis/equipment-details.service.ts
// OA-002 Equipment Details — aggregates platform master, samples, trends, and oil changes.

import { getPlatformSdk } from '../platform/platform-master-access';
import { findEquipmentById } from './equipment-master.service';
import type { OilAnalysisContractorScope } from './contractor-scope';
import {
  lpRegisterService,
  type LpRegisterConditionStatus,
  type LpRegisterRow,
} from './lp-register.service';
import {
  oilSampleService,
  computeSampleCondition,
  hasLabResults,
  type OilSampleRow,
  type SampleCondition,
} from './sample.service';
import { oilChangeService } from '../oil-lubrication/oil-change.service';
import type { OcRecord, OcTask } from '../oil-lubrication/oil-change.service';
import {
  analyzeOilParameterTrend,
  listOilChangeEvents,
  type OilTrendParameterId,
} from './trend.service';
import type { TrendAnalysisResult } from '../trend-engine';

export interface EquipmentLpCard {
  readonly id: string;
  readonly lpId: string;
  readonly lpName: string;
  readonly status: LpRegisterConditionStatus;
}

export interface EquipmentDetailsHeader {
  readonly equipmentId: string;
  readonly equipmentName: string;
  readonly area: string;
  readonly contractorId: string;
  readonly assetClass: string;
  readonly criticality: string;
  readonly oilType: string;
  readonly oilQuantity: string;
  readonly overallHealthStatus: LpRegisterConditionStatus;
}

export interface LatestSampleSummary {
  readonly sampleDate: string | null;
  readonly reportStatus: string;
  readonly equipmentRating: string;
  readonly lubricantRating: string;
  readonly contaminationRating: string;
  readonly oilType: string;
  readonly nextSampleDate: string | null;
  readonly sampleInternalId: string | null;
  readonly sampleCode: string | null;
  readonly pdfFileUrl: string | null;
}

export interface HistoricalSampleRow {
  readonly id: string;
  readonly sampleCode: string;
  readonly labSampleId: string;
  readonly sampledAt: string;
  readonly condition: SampleCondition;
  readonly reportStatus: string;
}

export interface LastActionStatus {
  readonly actionNumber: string;
  readonly statusLabel: string;
  readonly statusVariant: 'normal' | 'caution' | 'alert' | 'pending-review' | 'disabled';
  readonly lastUpdate: string;
  readonly agreedAction: string;
}

export interface OilChangeHistoryRow {
  readonly id: string;
  readonly performedAt: string;
  readonly oilTypeUsed: string;
  readonly quantityUsed: number;
  readonly technicianName: string;
  readonly status: string;
}

export interface EquipmentDetailsLpView {
  readonly lpId: string;
  readonly lpName: string;
  readonly latestSample: LatestSampleSummary;
  readonly historicalSamples: readonly HistoricalSampleRow[];
  readonly recommendations: string;
  readonly lastAction: LastActionStatus | null;
  readonly oilChangeHistory: readonly OilChangeHistoryRow[];
  readonly trendPreview: TrendAnalysisResult | null;
  readonly trendParameterId: OilTrendParameterId;
}

export interface EquipmentDetailsView {
  readonly header: EquipmentDetailsHeader;
  readonly lpCards: readonly EquipmentLpCard[];
  readonly selectedLpId: string;
  readonly lpView: EquipmentDetailsLpView;
}

export type EquipmentDetailsResult =
  | { readonly kind: 'ok'; readonly data: EquipmentDetailsView }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'forbidden' };

const STATUS_RANK: Record<LpRegisterConditionStatus, number> = {
  none: 0,
  pending: 1,
  normal: 2,
  caution: 3,
  alert: 4,
};

function worstLpStatus(statuses: readonly LpRegisterConditionStatus[]): LpRegisterConditionStatus {
  return statuses.reduce(
    (worst, current) => (STATUS_RANK[current] > STATUS_RANK[worst] ? current : worst),
    'none',
  );
}

function resolveLpName(lpId: string): string {
  const record = getPlatformSdk().lubricationPoints.findByLpId(lpId);
  return record?.name?.trim() || lpId;
}

function findOcTask(lpId: string): OcTask | null {
  return oilChangeService.listTasks().find((task) => task.lpId === lpId) ?? null;
}

function formatQuantity(task: OcTask | null): string {
  if (!task || task.standardQuantityL <= 0) return '—';
  return `${task.standardQuantityL} L`;
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

function conditionSeverity(condition: SampleCondition): LpRegisterConditionStatus {
  switch (condition) {
    case 'critical':
      return 'alert';
    case 'caution':
    case 'monitor':
      return 'caution';
    case 'normal':
      return 'normal';
    default:
      return 'pending';
  }
}

function samplesForLp(
  equipmentId: string,
  lpId: string,
  contractorId?: string,
): OilSampleRow[] {
  return oilSampleService
    .list()
    .filter((row) => {
      if (row.equipmentId !== equipmentId) return false;
      if (row.lubricationPointId !== lpId) return false;
      if (contractorId && row.contractorId !== contractorId) return false;
      return true;
    })
    .sort((a, b) => b.sampledAt.localeCompare(a.sampledAt));
}

function buildLatestSampleSummary(
  sample: OilSampleRow | null,
  lpRow: LpRegisterRow | null,
  oilType: string,
): LatestSampleSummary {
  return {
    sampleDate: sample?.sampledAt ?? null,
    reportStatus: resolveReportStatus(sample),
    equipmentRating: sample?.equipmentRating?.trim() || '—',
    lubricantRating: sample?.lubricantRating?.trim() || '—',
    contaminationRating: sample?.contaminationRating?.trim() || '—',
    oilType: sample?.lubricant?.trim() || oilType,
    nextSampleDate: lpRow?.nextSampleDate ?? null,
    sampleInternalId: sample?.id ?? null,
    sampleCode: sample?.sampleId ?? null,
    pdfFileUrl: sample?.pdfFileUrl ?? null,
  };
}

function buildHistoricalRows(samples: readonly OilSampleRow[]): HistoricalSampleRow[] {
  return samples.map((sample) => ({
    id: sample.id,
    sampleCode: sample.sampleId,
    labSampleId: sample.labSampleId,
    sampledAt: sample.sampledAt,
    condition: computeSampleCondition(sample),
    reportStatus: resolveReportStatus(sample),
  }));
}

function buildOilChangeHistory(
  equipmentId: string,
  lpId: string,
): readonly OilChangeHistoryRow[] {
  return oilChangeService
    .listRecords()
    .filter(
      (record: OcRecord) =>
        record.equipmentId === equipmentId &&
        record.lpId === lpId &&
        record.status !== 'cancelled',
    )
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt))
    .map((record) => ({
      id: record.id,
      performedAt: record.performedAt,
      oilTypeUsed: record.oilTypeUsed,
      quantityUsed: record.quantityUsed,
      technicianName: record.technicianName,
      status: record.status,
    }));
}

function buildLastAction(
  equipmentId: string,
  lpId: string,
): LastActionStatus | null {
  const samples = samplesForLp(equipmentId, lpId);
  const withAlert = samples.find((s) => s.alertType.trim().length > 0);
  if (!withAlert) return null;

  const condition = computeSampleCondition(withAlert);
  const statusVariant = conditionSeverity(condition);

  return {
    actionNumber: withAlert.sampleId,
    statusLabel: withAlert.status === 'alert' ? 'Open' : 'Monitoring',
    statusVariant:
      statusVariant === 'pending' || statusVariant === 'none'
        ? 'pending-review'
        : statusVariant,
    lastUpdate: withAlert.updatedAt.slice(0, 10),
    agreedAction: withAlert.alertType.trim(),
  };
}

function buildRecommendations(sample: OilSampleRow | null): string {
  if (!sample) return '';
  const analysis = sample.sampleAnalysis.trim();
  if (analysis) return analysis;
  const notes = sample.notes.trim();
  return notes;
}

function buildLpView(
  equipmentId: string,
  lpRow: LpRegisterRow,
  contractorFilter?: string,
): EquipmentDetailsLpView {
  const lpId = lpRow.lpId;
  const task = findOcTask(lpId);
  const oilType = task?.oilType ?? '';
  const samples = samplesForLp(equipmentId, lpId, contractorFilter);
  const latest = samples[0] ?? null;

  const trendPreview = analyzeOilParameterTrend({
    equipmentId,
    lubricationPointId: lpId,
    parameterId: 'iron',
    timeRange: 'all',
    highlightSampleId: latest?.id ?? null,
  });

  return {
    lpId,
    lpName: resolveLpName(lpId),
    latestSample: buildLatestSampleSummary(latest, lpRow, oilType),
    historicalSamples: buildHistoricalRows(samples),
    recommendations: buildRecommendations(latest),
    lastAction: buildLastAction(equipmentId, lpId),
    oilChangeHistory: buildOilChangeHistory(equipmentId, lpId),
    trendPreview,
    trendParameterId: 'iron',
  };
}

function resolveSelectedLp(
  lpRows: readonly LpRegisterRow[],
  requestedLpId?: string,
): LpRegisterRow | null {
  if (lpRows.length === 0) return null;
  const trimmed = requestedLpId?.trim();
  if (trimmed) {
    const found = lpRows.find((row) => row.lpId === trimmed);
    if (found) return found;
  }
  return lpRows[0] ?? null;
}

function applyContractorFilter(scope: OilAnalysisContractorScope): string | undefined {
  if (!scope.canViewAllContractors) return scope.lockedContractorId;
  return undefined;
}

export class EquipmentDetailsService {
  load(
    equipmentId: string,
    scope: OilAnalysisContractorScope,
    requestedLpId?: string,
  ): EquipmentDetailsResult {
    const id = equipmentId.trim();
    if (!id) return { kind: 'not-found' };

    const equipment = findEquipmentById(id);
    if (!equipment) return { kind: 'not-found' };

    const contractorFilter = applyContractorFilter(scope);
    if (contractorFilter && equipment.contractorId !== contractorFilter) {
      return { kind: 'forbidden' };
    }

    const lpRows = lpRegisterService
      .buildRows(scope)
      .filter((row) => row.equipmentId === id);

    if (lpRows.length === 0) {
      return { kind: 'not-found' };
    }

    const selectedRow = resolveSelectedLp(lpRows, requestedLpId);
    if (!selectedRow) return { kind: 'not-found' };

    const selectedTask = findOcTask(selectedRow.lpId);
    const selectedLpRecord = getPlatformSdk().lubricationPoints.findByLpId(selectedRow.lpId);
    const overallHealth = worstLpStatus(lpRows.map((row) => row.lastSampleStatus));

    const lpCards: EquipmentLpCard[] = lpRows.map((row) => ({
      id: row.id,
      lpId: row.lpId,
      lpName: resolveLpName(row.lpId),
      status: row.lastSampleStatus,
    }));

    const header: EquipmentDetailsHeader = {
      equipmentId: equipment.equipmentId,
      equipmentName: equipment.equipmentName,
      area: equipment.area,
      contractorId: equipment.contractorId,
      assetClass: '—',
      criticality: '—',
      oilType: selectedTask?.oilType || selectedLpRecord?.lubricant?.trim() || '—',
      oilQuantity: formatQuantity(selectedTask),
      overallHealthStatus: overallHealth,
    };

    return {
      kind: 'ok',
      data: {
        header,
        lpCards,
        selectedLpId: selectedRow.lpId,
        lpView: buildLpView(id, selectedRow, contractorFilter),
      },
    };
  }

  /** Sample timeline events for the selected LP (samples + oil changes). */
  buildSampleTimelineEvents(
    equipmentId: string,
    lpId: string,
    locale: string,
  ): readonly { id: string; date: string; label: string; status: LpRegisterConditionStatus }[] {
    const samples = samplesForLp(equipmentId, lpId).slice(0, 8);
    const oilChanges = listOilChangeEvents(equipmentId, lpId);

    const events: { id: string; date: string; label: string; status: LpRegisterConditionStatus }[] =
      [];

    for (const sample of samples) {
      const condition = computeSampleCondition(sample);
      events.push({
        id: `sample-${sample.id}`,
        date: sample.sampledAt,
        label: locale === 'ar'
          ? `عينة ${sample.sampleId}`
          : `Sample ${sample.sampleId}`,
        status: conditionSeverity(condition),
      });
    }

    for (const change of oilChanges) {
      events.push({
        id: `oc-${change.at}`,
        date: change.at,
        label: change.label,
        status: 'normal',
      });
    }

    return events.sort((a, b) => b.date.localeCompare(a.date));
  }
}

export const equipmentDetailsService = new EquipmentDetailsService();
