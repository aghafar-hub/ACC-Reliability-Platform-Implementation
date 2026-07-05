// apps/owner-center/src/modules/oil-analysis/lp-register.service.ts
// OA-001 Equipment & LP Register — aggregates platform LP master with latest oil sample.

import { createContractorId } from '@acc-reliability/sdk';
import { getPlatformSdk } from '../platform/platform-master-access';
import { findEquipmentById, listEquipmentMaster } from './equipment-master.service';
import type { OilAnalysisContractorScope } from './contractor-scope';
import {
  computeSampleCondition,
  oilSampleService,
} from './sample.service';
import type { OilSampleRow, SampleCondition } from './sample.service';

export type LpRegisterConditionStatus =
  | 'normal'
  | 'caution'
  | 'alert'
  | 'pending'
  | 'none';

export interface LpRegisterRow {
  readonly id: string;
  readonly lpId: string;
  readonly equipmentId: string;
  readonly equipmentName: string;
  readonly area: string;
  readonly contractorId: string;
  readonly lastSampleDate: string | null;
  readonly nextSampleDate: string | null;
  readonly lastSampleStatus: LpRegisterConditionStatus;
  readonly isSampleOverdue: boolean;
  readonly latestSampleId: string | null;
}

export interface LpRegisterFilterParams {
  readonly search?: string;
  readonly lpId?: string;
  readonly area?: string;
  readonly contractor?: string;
  readonly samplingDate?: string;
  readonly status?: string;
}

export interface LpRegisterKpis {
  readonly total: number;
  readonly normal: number;
  readonly caution: number;
  readonly alert: number;
  readonly pending: number;
  readonly noSample: number;
  readonly overdue: number;
}

export interface LpRegisterFilterOptions {
  readonly lpIds: readonly string[];
  readonly areas: readonly string[];
  readonly contractors: readonly string[];
}

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

function mapConditionToRegisterStatus(condition: SampleCondition): LpRegisterConditionStatus {
  switch (condition) {
    case 'normal':
      return 'normal';
    case 'monitor':
    case 'caution':
      return 'caution';
    case 'critical':
      return 'alert';
    case 'pending':
      return 'pending';
    default:
      return 'none';
  }
}

function latestSampleByLpId(samples: readonly OilSampleRow[]): Map<string, OilSampleRow> {
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

function buildEquipmentNameMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of listEquipmentMaster()) {
    map.set(row.equipmentId, row.equipmentName);
  }
  return map;
}

function resolveEquipmentName(equipmentId: string, cache: Map<string, string>): string {
  const cached = cache.get(equipmentId);
  if (cached) return cached;
  const found = findEquipmentById(equipmentId);
  return found?.equipmentName ?? equipmentId;
}

function applyContractorScope(
  scope: OilAnalysisContractorScope,
  contractorFilter?: string,
): string | undefined {
  if (!scope.canViewAllContractors) {
    return scope.lockedContractorId;
  }
  return contractorFilter?.trim() || undefined;
}

function matchesSearch(row: LpRegisterRow, query: string): boolean {
  const haystack = [
    row.lpId,
    row.equipmentId,
    row.equipmentName,
    row.area,
    row.contractorId,
  ].join(' ').toLowerCase();
  return haystack.includes(query);
}

function matchesFilters(row: LpRegisterRow, params: LpRegisterFilterParams): boolean {
  const search = params.search?.trim().toLowerCase() ?? '';
  if (search && !matchesSearch(row, search)) return false;
  if (params.lpId && row.lpId !== params.lpId) return false;
  if (params.area && row.area !== params.area) return false;
  if (params.samplingDate && row.lastSampleDate !== params.samplingDate) return false;

  if (params.status) {
    if (params.status === 'overdue') {
      if (!row.isSampleOverdue) return false;
    } else if (row.lastSampleStatus !== params.status) {
      return false;
    }
  }

  return true;
}

export class LpRegisterService {
  buildRows(scope: OilAnalysisContractorScope): readonly LpRegisterRow[] {
    const contractorId = applyContractorScope(scope);
    const lpResult = getPlatformSdk().lubricationPoints.list(
      contractorId ? { contractorId: createContractorId(contractorId), status: 'active' } : { status: 'active' },
    );

    const latestSamples = latestSampleByLpId(oilSampleService.list());
    const equipmentNames = buildEquipmentNameMap();
    const today = todayDateString();

    return lpResult.lubricationPoints.map((lp) => {
      const sample = latestSamples.get(lp.lpId) ?? null;
      const lastSampleDate = sample?.sampledAt ?? null;
      const interval = lp.samplingIntervalDays ?? lp.frequencyDays;
      const nextSampleDate =
        lastSampleDate && interval > 0 ? addDays(lastSampleDate, interval) : null;
      const lastSampleStatus = sample
        ? mapConditionToRegisterStatus(computeSampleCondition(sample))
        : 'none';
      const isSampleOverdue = nextSampleDate !== null && nextSampleDate < today;

      return {
        id: lp.id,
        lpId: lp.lpId,
        equipmentId: lp.equipmentId,
        equipmentName: resolveEquipmentName(lp.equipmentId, equipmentNames),
        area: lp.area,
        contractorId: lp.contractorId,
        lastSampleDate,
        nextSampleDate,
        lastSampleStatus,
        isSampleOverdue,
        latestSampleId: sample?.id ?? null,
      };
    });
  }

  list(
    scope: OilAnalysisContractorScope,
    params: LpRegisterFilterParams = {},
  ): readonly LpRegisterRow[] {
    const contractorScoped = applyContractorScope(scope, params.contractor);
    const rows = this.buildRows(scope).filter((row) => {
      if (contractorScoped && row.contractorId !== contractorScoped) return false;
      return matchesFilters(row, params);
    });
    return [...rows].sort((a, b) => a.lpId.localeCompare(b.lpId));
  }

  getFilterOptions(scope: OilAnalysisContractorScope): LpRegisterFilterOptions {
    const rows = this.buildRows(scope);
    return {
      lpIds: distinctSorted(rows.map((r) => r.lpId)),
      areas: distinctSorted(rows.map((r) => r.area)),
      contractors: distinctSorted(rows.map((r) => r.contractorId)),
    };
  }

  computeKpis(rows: readonly LpRegisterRow[]): LpRegisterKpis {
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
}

export const lpRegisterService = new LpRegisterService();

export function registerStatusBadge(
  status: LpRegisterConditionStatus,
): { variant: 'normal' | 'caution' | 'alert' | 'pending-review' | 'disabled'; label: string } {
  switch (status) {
    case 'normal':
      return { variant: 'normal', label: 'Normal' };
    case 'caution':
      return { variant: 'caution', label: 'Caution' };
    case 'alert':
      return { variant: 'alert', label: 'Alert' };
    case 'pending':
      return { variant: 'pending-review', label: 'Pending' };
    default:
      return { variant: 'disabled', label: 'No sample' };
  }
}
