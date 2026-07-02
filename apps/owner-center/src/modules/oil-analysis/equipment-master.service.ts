// apps/owner-center/src/modules/oil-analysis/equipment-master.service.ts
// Equipment Master read facade for Oil Analysis — sourced from Oil Lubrication tasks.

import { oilChangeService } from '../oil-lubrication/oil-change.service';

/** Equipment master row projected for Oil Analysis pickers. */
export interface EquipmentMasterRow {
  readonly equipmentId: string;
  readonly equipmentName: string;
  readonly area: string;
  readonly contractorId: string;
}

function buildEquipmentIndex(): Map<string, EquipmentMasterRow> {
  const index = new Map<string, EquipmentMasterRow>();
  for (const task of oilChangeService.listTasks()) {
    const equipmentId = task.equipmentId.trim();
    if (!equipmentId || index.has(equipmentId)) continue;
    index.set(equipmentId, {
      equipmentId,
      equipmentName: task.equipmentName,
      area: task.area,
      contractorId: task.contractorId,
    });
  }
  return index;
}

export function listEquipmentMaster(): readonly EquipmentMasterRow[] {
  return [...buildEquipmentIndex().values()].sort((a, b) =>
    a.equipmentId.localeCompare(b.equipmentId),
  );
}

export function findEquipmentById(equipmentId: string): EquipmentMasterRow | null {
  const id = equipmentId.trim();
  if (!id) return null;
  return buildEquipmentIndex().get(id) ?? null;
}

export function searchEquipment(query: string): readonly EquipmentMasterRow[] {
  const q = query.trim().toLowerCase();
  const all = listEquipmentMaster();
  if (!q) return all;
  return all.filter((row) =>
    [row.equipmentId, row.equipmentName, row.area, row.contractorId]
      .join(' ')
      .toLowerCase()
      .includes(q),
  );
}

export function isKnownEquipmentId(equipmentId: string): boolean {
  return findEquipmentById(equipmentId) !== null;
}
