// platform/services/src/equipment/equipment-repository.ts

import type { EquipmentId } from '../contracts/communication-types';
import { DuplicateEntityError, EntityNotFoundError } from '../errors';
import type {
  EquipmentRecord,
  EquipmentListQuery,
  EquipmentListResult,
  IEquipmentRepository,
} from './equipment-types';

const DEFAULT_LIST_LIMIT = 200;

export class InMemoryEquipmentRepository implements IEquipmentRepository {
  private readonly store = new Map<string, EquipmentRecord>();

  save(record: EquipmentRecord): EquipmentRecord {
    if (this.store.has(record.equipmentId)) {
      throw new DuplicateEntityError(
        `Equipment '${record.equipmentId}' already exists`,
        { equipmentId: record.equipmentId },
      );
    }
    const frozen = Object.freeze({ ...record });
    this.store.set(record.equipmentId, frozen);
    return frozen;
  }

  update(record: EquipmentRecord): EquipmentRecord {
    if (!this.store.has(record.equipmentId)) {
      throw new EntityNotFoundError(
        `Equipment '${record.equipmentId}' not found`,
        { equipmentId: record.equipmentId },
      );
    }
    const frozen = Object.freeze({ ...record });
    this.store.set(record.equipmentId, frozen);
    return frozen;
  }

  findById(equipmentId: EquipmentId): EquipmentRecord | null {
    return this.store.get(equipmentId) ?? null;
  }

  list(query?: EquipmentListQuery): EquipmentListResult {
    const offset = query?.offset ?? 0;
    const limit = query?.limit ?? DEFAULT_LIST_LIMIT;
    const matched: EquipmentRecord[] = [];

    for (const record of this.store.values()) {
      if (!this.matchesQuery(record, query)) continue;
      matched.push(record);
    }

    matched.sort((a, b) => a.equipmentId.localeCompare(b.equipmentId));

    return {
      equipment: matched.slice(offset, offset + limit),
      total: matched.length,
      offset,
      limit,
    };
  }

  count(): number {
    return this.store.size;
  }

  remove(equipmentId: EquipmentId): boolean {
    return this.store.delete(equipmentId);
  }

  private matchesQuery(record: EquipmentRecord, query?: EquipmentListQuery): boolean {
    if (query === undefined) return true;
    if (query.status !== undefined && record.status !== query.status) return false;
    if (query.contractorId !== undefined && record.contractorId !== query.contractorId) return false;
    if (query.area !== undefined && record.area !== query.area) return false;
    if (query.searchText !== undefined && query.searchText.trim().length > 0) {
      const needle = query.searchText.toLowerCase();
      const haystack = [record.equipmentId, record.name, record.area, record.contractorId]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  }
}
