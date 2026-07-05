// apps/owner-center/src/modules/oil-analysis/timeline.service.ts
// OA-007 Timeline — combined sample and oil-change history for one LP.

import { getPlatformSdk } from '../platform/platform-master-access';
import type { OilAnalysisContractorScope } from './contractor-scope';
import {
  lpRegisterService,
  registerStatusBadge,
  type LpRegisterConditionStatus,
  type LpRegisterRow,
} from './lp-register.service';
import {
  oilSampleService,
  computeSampleCondition,
  type OilSampleRow,
  type SampleCondition,
} from './sample.service';
import { oilChangeService } from '../oil-lubrication/oil-change.service';
import type { OcRecord, OcTask } from '../oil-lubrication/oil-change.service';
import { listOilChangeEvents } from './trend.service';

export type TimelineEventType =
  | 'sample-normal'
  | 'sample-caution'
  | 'sample-alert'
  | 'oil-change'
  | 'future-sample'
  | 'future-oil-change';

export interface OilAnalysisTimelineHeader {
  readonly equipmentName: string;
  readonly equipmentId: string;
  readonly lpId: string;
  readonly lpName: string;
  readonly samplingFrequency: string;
  readonly oilChangeFrequency: string;
  readonly currentStatus: LpRegisterConditionStatus;
}

export interface OilAnalysisTimelineSummary {
  readonly lastSampleDate: string | null;
  readonly lastSampleStatus: LpRegisterConditionStatus | null;
  readonly nextSampleDate: string | null;
  readonly lastOilChangeDate: string | null;
  readonly nextOilChangeDate: string | null;
  readonly daysRemaining: number | null;
}

export interface OilAnalysisTimelineEvent {
  readonly id: string;
  readonly eventType: TimelineEventType;
  readonly isoDate: string;
  readonly label: string;
  readonly statusLabel: string;
}

export interface OilAnalysisTimelineView {
  readonly header: OilAnalysisTimelineHeader;
  readonly summary: OilAnalysisTimelineSummary;
  readonly events: readonly OilAnalysisTimelineEvent[];
}

export type OilAnalysisTimelineResult =
  | { readonly kind: 'ok'; readonly data: OilAnalysisTimelineView }
  | { readonly kind: 'empty' }
  | { readonly kind: 'forbidden' };

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function formatFrequencyDays(days: number, locale: string): string {
  if (days <= 0) return '—';
  if (days % 30 === 0) {
    const months = days / 30;
    if (locale === 'ar') {
      return months === 1 ? 'شهر واحد' : `${months} أشهر`;
    }
    return months === 1 ? '1 Month' : `${months} Months`;
  }
  return locale === 'ar' ? `${days} يوم` : `${days} Days`;
}

function resolveLpName(lpId: string): string {
  const record = getPlatformSdk().lubricationPoints.findByLpId(lpId);
  return record?.name?.trim() || lpId;
}

function findOcTask(lpId: string): OcTask | null {
  return oilChangeService.listTasks().find((task) => task.lpId === lpId) ?? null;
}

function mapConditionToEventType(condition: SampleCondition): TimelineEventType {
  switch (condition) {
    case 'critical':
      return 'sample-alert';
    case 'caution':
    case 'monitor':
      return 'sample-caution';
    case 'normal':
      return 'sample-normal';
    default:
      return 'sample-normal';
  }
}

function conditionToStatus(condition: SampleCondition): LpRegisterConditionStatus {
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

function sampleStatusLabel(condition: SampleCondition, locale: string): string {
  const map: Record<SampleCondition, { en: string; ar: string }> = {
    normal: { en: 'Normal', ar: 'طبيعي' },
    monitor: { en: 'Monitor', ar: 'مراقبة' },
    caution: { en: 'Caution', ar: 'حذر' },
    critical: { en: 'Alert', ar: 'تنبيه' },
    pending: { en: 'Pending', ar: 'قيد الانتظار' },
  };
  return locale === 'ar' ? map[condition].ar : map[condition].en;
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
    .sort((a, b) => a.sampledAt.localeCompare(b.sampledAt));
}

function lastOilChangeDate(equipmentId: string, lpId: string): string | null {
  const records = oilChangeService
    .listRecords()
    .filter(
      (record: OcRecord) =>
        record.equipmentId === equipmentId &&
        record.lpId === lpId &&
        record.status === 'completed',
    )
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt));
  return records[0]?.performedAt.slice(0, 10) ?? null;
}

function resolveSamplingIntervalDays(lpId: string): number {
  const lp = getPlatformSdk().lubricationPoints.findByLpId(lpId);
  if (!lp) return 0;
  return lp.samplingIntervalDays ?? lp.frequencyDays ?? 0;
}

function buildEvents(
  equipmentId: string,
  lpId: string,
  lpRow: LpRegisterRow,
  contractorId: string | undefined,
  locale: string,
): OilAnalysisTimelineEvent[] {
  const events: OilAnalysisTimelineEvent[] = [];

  for (const sample of samplesForLp(equipmentId, lpId, contractorId)) {
    const condition = computeSampleCondition(sample);
    events.push({
      id: `sample-${sample.id}`,
      eventType: mapConditionToEventType(condition),
      isoDate: sample.sampledAt.slice(0, 10),
      label: locale === 'ar'
        ? `عينة ${sample.sampleId}`
        : `Sample ${sample.sampleId}`,
      statusLabel: sampleStatusLabel(condition, locale),
    });
  }

  for (const change of listOilChangeEvents(equipmentId, lpId)) {
    events.push({
      id: `oc-${change.at}`,
      eventType: 'oil-change',
      isoDate: change.at,
      label: locale === 'ar' ? 'تغيير الزيت' : 'Oil Changed',
      statusLabel: locale === 'ar' ? 'تم تغيير الزيت' : 'Oil Changed',
    });
  }

  if (lpRow.nextSampleDate) {
    events.push({
      id: 'future-sample',
      eventType: 'future-sample',
      isoDate: lpRow.nextSampleDate,
      label: locale === 'ar' ? 'العينة القادمة' : 'Next Sample',
      statusLabel: locale === 'ar' ? 'مخطط' : 'Planned',
    });
  }

  const ocTask = findOcTask(lpId);
  const nextOilChange = ocTask?.dueDate?.slice(0, 10) ?? null;
  if (nextOilChange) {
    events.push({
      id: 'future-oil-change',
      eventType: 'future-oil-change',
      isoDate: nextOilChange,
      label: locale === 'ar' ? 'تغيير الزيت القادم' : 'Next Oil Change',
      statusLabel: locale === 'ar' ? 'مخطط' : 'Planned',
    });
  }

  return events.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
}

function buildView(lpRow: LpRegisterRow, locale: string, contractorId?: string): OilAnalysisTimelineView {
  const { equipmentId, lpId } = lpRow;
  const ocTask = findOcTask(lpId);
  const samplingDays = resolveSamplingIntervalDays(lpId);
  const oilChangeDays = ocTask?.frequencyDays ?? 0;
  const lastOc = lastOilChangeDate(equipmentId, lpId);
  const nextOc = ocTask?.dueDate?.slice(0, 10) ?? null;
  const today = todayDateString();
  const daysRemaining =
    lpRow.nextSampleDate !== null
      ? daysBetween(today, lpRow.nextSampleDate)
      : null;

  return {
    header: {
      equipmentName: lpRow.equipmentName,
      equipmentId,
      lpId,
      lpName: resolveLpName(lpId),
      samplingFrequency: formatFrequencyDays(samplingDays, locale),
      oilChangeFrequency: formatFrequencyDays(oilChangeDays, locale),
      currentStatus: lpRow.lastSampleStatus,
    },
    summary: {
      lastSampleDate: lpRow.lastSampleDate,
      lastSampleStatus: lpRow.lastSampleStatus === 'none' ? null : lpRow.lastSampleStatus,
      nextSampleDate: lpRow.nextSampleDate,
      lastOilChangeDate: lastOc,
      nextOilChangeDate: nextOc,
      daysRemaining,
    },
    events: buildEvents(equipmentId, lpId, lpRow, contractorId, locale),
  };
}

function applyContractorFilter(scope: OilAnalysisContractorScope): string | undefined {
  if (!scope.canViewAllContractors) return scope.lockedContractorId;
  return undefined;
}

function resolveSelectedRow(
  rows: readonly LpRegisterRow[],
  requestedLpId?: string,
): LpRegisterRow | null {
  if (rows.length === 0) return null;
  const trimmed = requestedLpId?.trim();
  if (trimmed) {
    const found = rows.find((row) => row.lpId === trimmed);
    if (found) return found;
  }
  return rows[0] ?? null;
}

export class OilAnalysisTimelineService {
  listLpOptions(
    scope: OilAnalysisContractorScope,
    search?: string,
  ): readonly { lpId: string; label: string }[] {
    const rows = lpRegisterService.list(scope, { search });
    return rows.map((row) => ({
      lpId: row.lpId,
      label: `${row.lpId} — ${row.equipmentName}`,
    }));
  }

  load(
    scope: OilAnalysisContractorScope,
    locale: string,
    requestedLpId?: string,
    search?: string,
  ): OilAnalysisTimelineResult {
    const contractorId = applyContractorFilter(scope);
    const params: { search?: string; lpId?: string } = {};
    if (search?.trim()) params.search = search.trim();
    if (requestedLpId?.trim()) params.lpId = requestedLpId.trim();

    const rows = lpRegisterService.list(scope, params);
    const selected = resolveSelectedRow(rows, requestedLpId);

    if (!selected) {
      return { kind: 'empty' };
    }

    if (
      contractorId &&
      selected.contractorId !== contractorId
    ) {
      return { kind: 'forbidden' };
    }

    return {
      kind: 'ok',
      data: buildView(selected, locale, contractorId),
    };
  }
}

export function mapTimelineEventSeverity(
  eventType: TimelineEventType,
): 'normal' | 'caution' | 'alert' | 'info' | 'future' {
  switch (eventType) {
    case 'sample-alert':
      return 'alert';
    case 'sample-caution':
      return 'caution';
    case 'sample-normal':
      return 'normal';
    case 'oil-change':
      return 'info';
    case 'future-sample':
    case 'future-oil-change':
      return 'future';
    default:
      return 'info';
  }
}

export function mapTimelineEventKind(
  eventType: TimelineEventType,
): 'sample' | 'oil-change' | 'future' {
  if (eventType.startsWith('sample-')) return 'sample';
  if (eventType === 'oil-change') return 'oil-change';
  return 'future';
}

export { registerStatusBadge };

export const oilAnalysisTimelineService = new OilAnalysisTimelineService();
