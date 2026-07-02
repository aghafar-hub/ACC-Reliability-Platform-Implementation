// apps/owner-center/src/modules/oil-analysis/equipment-master.service.ts
// Equipment Master read facade — backed by Platform Equipment Master (sdk.equipment).

import { createEquipmentId } from '@acc-reliability/sdk';
import { getPlatformSdk } from '../platform/platform-master-access';

/** Equipment master row projected for Oil Analysis pickers. */
export interface EquipmentMasterRow {
  readonly equipmentId: string;
  readonly equipmentName: string;
  readonly area: string;
  readonly contractorId: string;
}

function toRow(record: {
  equipmentId: string;
  name: string;
  area: string;
  contractorId: string;
}): EquipmentMasterRow {
  return {
    equipmentId: record.equipmentId,
    equipmentName: record.name,
    area: record.area,
    contractorId: record.contractorId,
  };
}

export function listEquipmentMaster(): readonly EquipmentMasterRow[] {
  const result = getPlatformSdk().equipment.list({ status: 'active' });
  return result.equipment.map(toRow);
}

export function findEquipmentById(equipmentId: string): EquipmentMasterRow | null {
  const id = equipmentId.trim();
  if (!id) return null;
  const record = getPlatformSdk().equipment.findById(createEquipmentId(id));
  return record === null ? null : toRow(record);
}

export function searchEquipment(query: string): readonly EquipmentMasterRow[] {
  const q = query.trim();
  const result = getPlatformSdk().equipment.list(
    q ? { searchText: q, status: 'active' } : { status: 'active' },
  );
  return result.equipment.map(toRow);
}

export function isKnownEquipmentId(equipmentId: string): boolean {
  return findEquipmentById(equipmentId) !== null;
}
