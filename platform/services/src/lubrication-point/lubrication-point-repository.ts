// platform/services/src/lubrication-point/lubrication-point-repository.ts

import { DuplicateEntityError, EntityNotFoundError } from '../errors';
import type { EquipmentId } from '../contracts/communication-types';
import type {
  LubricationPointRecord,
  LubricationPointRecordId,
  LubricationPointListQuery,
  LubricationPointListResult,
  ILubricationPointRepository,
} from './lubrication-point-types';

const DEFAULT_LIST_LIMIT = 200;

export class InMemoryLubricationPointRepository implements ILubricationPointRepository {
  private readonly store = new Map<string, LubricationPointRecord>();
  private readonly lpIdIndex = new Map<string, string>();

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
    return this.store.delete(id);
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
        record.lpId,
        record.name,
        record.equipmentId,
        record.lubricant,
        record.area,
        record.contractorId,
      ].join(' ').toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  }
}
