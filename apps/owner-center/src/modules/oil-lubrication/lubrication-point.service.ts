// apps/owner-center/src/modules/oil-lubrication/lubrication-point.service.ts
// Lubrication Point Explorer facade — backed by Platform LP Master (sdk.lubricationPoints).
//
// Sprint 02 — Lubrication Point Explorer.
// Sprint 01 Platform Integration — unified platform master data source.

import type { LubricationPointRecord } from '@acc-reliability/sdk';
import { createContractorId, createEquipmentId } from '@acc-reliability/sdk';
import { getPlatformSdk } from '../platform/platform-master-access';

// ── View model ────────────────────────────────────────────────────────────────

/** Row used by the Explorer UI; flat projection of a lubrication point. */
export interface LpExplorerRow {
  readonly id:                  string;
  /** LP_ID code visible to technicians (e.g. "LP-001"). */
  readonly lubricationPointId:  string;
  /** Equipment master ID (e.g. "EQ-PUMP-A01"). */
  readonly equipmentId:         string;
  /** Owning contractor code (e.g. "ACC", "RHI"). */
  readonly contractorId:        string;
  /** Human-readable name (e.g. "Main Bearing"). */
  readonly name:                string;
  /** Plant area (e.g. "Area-01"). */
  readonly area:                string;
  /** Lubricant type / grade (e.g. "ISO VG 46"). */
  readonly oilType:             string;
  /** Scheduled service interval in calendar days. */
  readonly frequencyDays:       number;
  /** ISO date of last oil change, or null if never changed. */
  readonly lastChangeDate:      string | null;
  /** ISO date when next change is due, or null if not scheduled. */
  readonly nextDueDate:         string | null;
  /** Whether the point is operationally active. */
  readonly isActive:            boolean;
  readonly createdAt:           string;
  readonly updatedAt:           string;
}

/** Operational status derived from due dates and active flag. */
export type LpStatus = 'active' | 'due-soon' | 'overdue' | 'inactive';

/** Compute display status from a row — pure function, no side effects. */
export function computeLpStatus(row: LpExplorerRow): LpStatus {
  if (!row.isActive) return 'inactive';
  if (!row.nextDueDate) return 'active';
  const today = new Date();
  const due   = new Date(row.nextDueDate);
  if (due < today) return 'overdue';
  const diffDays = (due.getTime() - today.getTime()) / 86_400_000;
  return diffDays <= 7 ? 'due-soon' : 'active';
}

// ── Create / update input types ───────────────────────────────────────────────

export interface LpCreateInput {
  readonly lubricationPointId: string;
  readonly equipmentId:        string;
  readonly contractorId:       string;
  readonly name:               string;
  readonly area:               string;
  readonly oilType:            string;
  readonly frequencyDays:      number;
  readonly lastChangeDate:     string | null;
  readonly nextDueDate:        string | null;
}

export type LpUpdateInput = Partial<
  Pick<
    LpExplorerRow,
    'name' | 'area' | 'oilType' | 'frequencyDays' | 'lastChangeDate' | 'nextDueDate' | 'isActive'
  >
>;

function toExplorerRow(record: LubricationPointRecord): LpExplorerRow {
  return {
    id: record.id,
    lubricationPointId: record.lpId,
    equipmentId: record.equipmentId,
    contractorId: record.contractorId,
    name: record.name,
    area: record.area,
    oilType: record.lubricant,
    frequencyDays: record.frequencyDays,
    lastChangeDate: record.lastChangeDate,
    nextDueDate: record.nextDueDate,
    isActive: record.status === 'active',
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Business service facade for lubrication point operations.
 * Delegates to the platform Lubrication Point Master via sdk.lubricationPoints.
 */
export class LubricationPointLocalService {
  list(): readonly LpExplorerRow[] {
    return getPlatformSdk()
      .lubricationPoints
      .list()
      .lubricationPoints
      .map(toExplorerRow);
  }

  create(input: LpCreateInput): LpExplorerRow {
    if (!input.lubricationPointId.trim()) {
      throw new Error('LP ID is required.');
    }
    if (!input.equipmentId.trim()) {
      throw new Error('Equipment ID is required.');
    }
    if (!input.name.trim()) {
      throw new Error('Name is required.');
    }

    const equipment = getPlatformSdk().equipment.findById(
      createEquipmentId(input.equipmentId.trim()),
    );
    if (equipment === null) {
      throw new Error(`Equipment '${input.equipmentId}' is not in the platform master.`);
    }

    const record = getPlatformSdk().lubricationPoints.create({
      lpId: input.lubricationPointId.trim(),
      equipmentId: createEquipmentId(input.equipmentId.trim()),
      contractorId: createContractorId(input.contractorId.trim()),
      name: input.name.trim(),
      area: input.area.trim(),
      lubricant: input.oilType.trim(),
      frequencyDays: input.frequencyDays,
      lastChangeDate: input.lastChangeDate,
      nextDueDate: input.nextDueDate,
    });
    return toExplorerRow(record);
  }

  update(id: string, changes: LpUpdateInput): LpExplorerRow {
    const record = getPlatformSdk().lubricationPoints.update(
      id as LubricationPointRecord['id'],
      {
        ...(changes.name !== undefined ? { name: changes.name } : {}),
        ...(changes.area !== undefined ? { area: changes.area } : {}),
        ...(changes.oilType !== undefined ? { lubricant: changes.oilType } : {}),
        ...(changes.frequencyDays !== undefined ? { frequencyDays: changes.frequencyDays } : {}),
        ...(changes.lastChangeDate !== undefined ? { lastChangeDate: changes.lastChangeDate } : {}),
        ...(changes.nextDueDate !== undefined ? { nextDueDate: changes.nextDueDate } : {}),
        ...(changes.isActive !== undefined
          ? { status: changes.isActive ? 'active' : 'inactive' }
          : {}),
      },
    );
    return toExplorerRow(record);
  }

  deactivate(id: string): LpExplorerRow {
    const record = getPlatformSdk().lubricationPoints.deactivate(
      id as LubricationPointRecord['id'],
    );
    return toExplorerRow(record);
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const lubricationPointService = new LubricationPointLocalService();
