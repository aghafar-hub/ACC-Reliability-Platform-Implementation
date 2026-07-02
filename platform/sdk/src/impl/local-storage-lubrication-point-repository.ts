// platform/sdk/src/impl/local-storage-lubrication-point-repository.ts

import { DuplicateEntityError, EntityNotFoundError } from '@acc-reliability/services';
import type {
  LubricationPointRecord,
  LubricationPointRecordId,
  LubricationPointListQuery,
  LubricationPointListResult,
  ILubricationPointRepository,
} from '@acc-reliability/services';
import type { EquipmentId } from '@acc-reliability/services';

const STORAGE_KEY = 'platform.lp.registry';
const LEGACY_LP_KEY = 'acc.oil-lube.lp.registry';
const DEFAULT_LIST_LIMIT = 200;

export class LocalStorageLubricationPointRepository implements ILubricationPointRepository {
  private readonly store = new Map<string, LubricationPointRecord>();
  private readonly lpIdIndex = new Map<string, string>();

  constructor() {
    this.hydrate();
  }

  save(record: LubricationPointRecord): LubricationPointRecord {
    if (this.store.has(record.id)) {
      throw new DuplicateEntityError(`LP record '${record.id}' already exists`, { id: record.id });
    }
    const lpKey = record.lpId.trim().toUpperCase();
    if (this.lpIdIndex.has(lpKey)) {
      throw new DuplicateEntityError(`LP ID '${record.lpId}' already exists`, { lpId: record.lpId });
    }
    const frozen = Object.freeze({ ...record });
    this.store.set(record.id, frozen);
    this.lpIdIndex.set(lpKey, record.id);
    this.persist();
    return frozen;
  }

  update(record: LubricationPointRecord): LubricationPointRecord {
    const existing = this.store.get(record.id);
    if (existing === undefined) {
      throw new EntityNotFoundError(`LP record '${record.id}' not found`, { id: record.id });
    }
    if (existing.lpId !== record.lpId) {
      const oldKey = existing.lpId.trim().toUpperCase();
      const newKey = record.lpId.trim().toUpperCase();
      if (this.lpIdIndex.has(newKey) && this.lpIdIndex.get(newKey) !== record.id) {
        throw new DuplicateEntityError(`LP ID '${record.lpId}' already exists`, { lpId: record.lpId });
      }
      this.lpIdIndex.delete(oldKey);
      this.lpIdIndex.set(newKey, record.id);
    }
    const frozen = Object.freeze({ ...record });
    this.store.set(record.id, frozen);
    this.persist();
    return frozen;
  }

  findById(id: LubricationPointRecordId): LubricationPointRecord | null {
    return this.store.get(id) ?? null;
  }

  findByLpId(lpId: string): LubricationPointRecord | null {
    const id = this.lpIdIndex.get(lpId.trim().toUpperCase());
    if (id === undefined) return null;
    return this.store.get(id) ?? null;
  }

  list(query?: LubricationPointListQuery): LubricationPointListResult {
    const offset = query?.offset ?? 0;
    const limit = query?.limit ?? DEFAULT_LIST_LIMIT;
    const matched: LubricationPointRecord[] = [];

    for (const record of this.store.values()) {
      if (!this.matchesQuery(record, query)) continue;
      matched.push(record);
    }

    matched.sort((a, b) => a.lpId.localeCompare(b.lpId));

    return {
      lubricationPoints: matched.slice(offset, offset + limit),
      total: matched.length,
      offset,
      limit,
    };
  }

  count(): number {
    return this.store.size;
  }

  remove(id: LubricationPointRecordId): boolean {
    const existing = this.store.get(id);
    if (existing === undefined) return false;
    this.lpIdIndex.delete(existing.lpId.trim().toUpperCase());
    const deleted = this.store.delete(id);
    if (deleted) this.persist();
    return deleted;
  }

  private hydrate(): void {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        const records = JSON.parse(raw) as LubricationPointRecord[];
        if (Array.isArray(records)) {
          for (const record of records) {
            if (!record?.id || !record?.lpId) continue;
            const frozen = Object.freeze({ ...record });
            this.store.set(record.id, frozen);
            this.lpIdIndex.set(record.lpId.trim().toUpperCase(), record.id);
          }
          return;
        }
      }
      this.migrateFromLegacyLpRegistry();
    } catch {
      // Start empty — seed will populate.
    }
  }

  private migrateFromLegacyLpRegistry(): void {
    try {
      const raw = window.localStorage.getItem(LEGACY_LP_KEY);
      if (raw === null) return;
      const rows = JSON.parse(raw) as Array<{
        id?: string;
        lubricationPointId?: string;
        equipmentId?: string;
        contractorId?: string;
        name?: string;
        area?: string;
        oilType?: string;
        frequencyDays?: number;
        lastChangeDate?: string | null;
        nextDueDate?: string | null;
        isActive?: boolean;
        createdAt?: string;
        updatedAt?: string;
      }>;
      if (!Array.isArray(rows)) return;

      const now = new Date().toISOString();
      for (const row of rows) {
        if (!row.id || !row.lubricationPointId) continue;
        const record: LubricationPointRecord = Object.freeze({
          id: row.id as LubricationPointRecordId,
          lpId: row.lubricationPointId,
          equipmentId: (row.equipmentId ?? '') as EquipmentId,
          lubricant: row.oilType ?? '',
          frequencyDays: row.frequencyDays ?? 30,
          oaRequired: false,
          samplingIntervalDays: null,
          status: row.isActive === false ? 'inactive' : 'active',
          area: row.area ?? '',
          contractorId: (row.contractorId ?? 'ACC') as LubricationPointRecord['contractorId'],
          name: row.name ?? row.lubricationPointId,
          lastChangeDate: row.lastChangeDate ?? null,
          nextDueDate: row.nextDueDate ?? null,
          createdAt: row.createdAt ?? now,
          createdBy: 'platform.system' as LubricationPointRecord['createdBy'],
          updatedAt: row.updatedAt ?? now,
          updatedBy: 'platform.system' as LubricationPointRecord['updatedBy'],
        });
        this.store.set(record.id, record);
        this.lpIdIndex.set(record.lpId.trim().toUpperCase(), record.id);
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

  private matchesQuery(record: LubricationPointRecord, query?: LubricationPointListQuery): boolean {
    if (query === undefined) return true;
    if (query.equipmentId !== undefined && record.equipmentId !== query.equipmentId) return false;
    if (query.contractorId !== undefined && record.contractorId !== query.contractorId) return false;
    if (query.area !== undefined && record.area !== query.area) return false;
    if (query.status !== undefined && record.status !== query.status) return false;
    if (query.searchText !== undefined && query.searchText.trim().length > 0) {
      const needle = query.searchText.toLowerCase();
      const haystack = [
        record.lpId, record.name, record.equipmentId, record.lubricant, record.area, record.contractorId,
      ].join(' ').toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  }
}
