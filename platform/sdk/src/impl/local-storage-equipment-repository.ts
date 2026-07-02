// platform/sdk/src/impl/local-storage-equipment-repository.ts

import { DuplicateEntityError, EntityNotFoundError } from '@acc-reliability/services';
import type {
  EquipmentRecord,
  EquipmentId,
  EquipmentListQuery,
  EquipmentListResult,
  IEquipmentRepository,
} from '@acc-reliability/services';

const STORAGE_KEY = 'platform.equipment.registry';
const LEGACY_OIL_CHANGE_KEY = 'acc.oil-change.tasks.v1';
const DEFAULT_LIST_LIMIT = 200;

export class LocalStorageEquipmentRepository implements IEquipmentRepository {
  private readonly store = new Map<string, EquipmentRecord>();

  constructor() {
    this.hydrate();
  }

  save(record: EquipmentRecord): EquipmentRecord {
    if (this.store.has(record.equipmentId)) {
      throw new DuplicateEntityError(
        `Equipment '${record.equipmentId}' already exists`,
        { equipmentId: record.equipmentId },
      );
    }
    const frozen = Object.freeze({ ...record });
    this.store.set(record.equipmentId, frozen);
    this.persist();
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
    this.persist();
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
    const deleted = this.store.delete(equipmentId);
    if (deleted) this.persist();
    return deleted;
  }

  private hydrate(): void {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        const records = JSON.parse(raw) as EquipmentRecord[];
        if (Array.isArray(records)) {
          for (const record of records) {
            if (!record?.equipmentId) continue;
            this.store.set(record.equipmentId, Object.freeze({ ...record }));
          }
          return;
        }
      }
      this.migrateFromLegacyOilChangeTasks();
    } catch {
      // Start empty — seed will populate.
    }
  }

  private migrateFromLegacyOilChangeTasks(): void {
    try {
      const raw = window.localStorage.getItem(LEGACY_OIL_CHANGE_KEY);
      if (raw === null) return;
      const tasks = JSON.parse(raw) as Array<{
        equipmentId?: string;
        equipmentName?: string;
        area?: string;
        contractorId?: string;
        isActive?: boolean;
      }>;
      if (!Array.isArray(tasks)) return;

      const now = new Date().toISOString();
      for (const task of tasks) {
        const equipmentId = task.equipmentId?.trim();
        if (!equipmentId || this.store.has(equipmentId)) continue;
        this.store.set(equipmentId, Object.freeze({
          equipmentId: equipmentId as EquipmentId,
          name: task.equipmentName ?? equipmentId,
          area: task.area ?? '',
          contractorId: (task.contractorId ?? 'ACC') as EquipmentRecord['contractorId'],
          status: task.isActive === false ? 'inactive' : 'active',
          createdAt: now,
          createdBy: 'platform.system' as EquipmentRecord['createdBy'],
          updatedAt: now,
          updatedBy: 'platform.system' as EquipmentRecord['updatedBy'],
        }));
      }
      if (this.store.size > 0) this.persist();
    } catch {
      // Ignore migration failures.
    }
  }

  private persist(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(this.store.values())));
    } catch {
      // Quota exceeded or private mode.
    }
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
