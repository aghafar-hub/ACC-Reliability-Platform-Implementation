// platform/services/src/module/module-repository.ts
// In-memory implementation of IModuleRepository.
//
// Responsibilities:
//   - Append-once save, replace-in-place update, keyed by ModuleRecordId.
//   - Module key uniqueness index for O(1) lookup.
//   - AND-filtered list queries with offset/limit pagination.
//   - Full-text search on name, moduleKey, category (case-insensitive substring).
//
// Non-responsibilities:
//   - Business rules (enforced by ModuleService).
//   - Audit recording (ModuleService responsibility).
//   - Durable persistence (SQL migration hook reserved for a future milestone).

import { DuplicateEntityError, EntityNotFoundError } from '../errors';
import type {
  ModuleRecord,
  ModuleRecordId,
  ModuleListQuery,
  ModuleListResult,
  IModuleRepository,
} from './module-types';

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_LIST_LIMIT = 50;

// ── InMemoryModuleRepository ──────────────────────────────────────────────────

/**
 * In-memory implementation of the module repository.
 *
 * Storage:
 *  - Primary store: `Map<id, ModuleRecord>` preserves insertion order.
 *  - Key index:     `Map<moduleKey, id>` for O(1) lookup.
 *
 * All stored records are frozen with `Object.freeze` at write time.
 */
export class InMemoryModuleRepository implements IModuleRepository {
  private readonly store    = new Map<string, ModuleRecord>();
  private readonly keyIndex = new Map<string, string>();

  // ── save ──────────────────────────────────────────────────────────────────

  save(module: ModuleRecord): ModuleRecord {
    if (this.store.has(module.id)) {
      throw new DuplicateEntityError(
        `Module record '${module.id}' already exists`,
        { id: module.id },
      );
    }

    const keyNorm = module.moduleKey.toLowerCase();
    if (this.keyIndex.has(keyNorm)) {
      throw new DuplicateEntityError(
        `Module key '${module.moduleKey}' already exists`,
        { moduleKey: module.moduleKey },
      );
    }

    const frozen = Object.freeze({ ...module });
    this.store.set(module.id, frozen);
    this.keyIndex.set(keyNorm, module.id);
    return frozen;
  }

  // ── update ────────────────────────────────────────────────────────────────

  update(module: ModuleRecord): ModuleRecord {
    const existing = this.store.get(module.id);
    if (existing === undefined) {
      throw new EntityNotFoundError(
        `Module record '${module.id}' not found`,
        { id: module.id },
      );
    }

    if (existing.moduleKey !== module.moduleKey) {
      const oldKey = existing.moduleKey.toLowerCase();
      const newKey = module.moduleKey.toLowerCase();

      if (this.keyIndex.has(newKey) && this.keyIndex.get(newKey) !== module.id) {
        throw new DuplicateEntityError(
          `Module key '${module.moduleKey}' already exists`,
          { moduleKey: module.moduleKey },
        );
      }

      this.keyIndex.delete(oldKey);
      this.keyIndex.set(newKey, module.id);
    }

    const frozen = Object.freeze({ ...module });
    this.store.set(module.id, frozen);
    return frozen;
  }

  // ── findById ──────────────────────────────────────────────────────────────

  findById(id: ModuleRecordId): ModuleRecord | null {
    return this.store.get(id) ?? null;
  }

  // ── findByKey ─────────────────────────────────────────────────────────────

  findByKey(moduleKey: string): ModuleRecord | null {
    const id = this.keyIndex.get(moduleKey.toLowerCase());
    if (id === undefined) return null;
    return this.store.get(id) ?? null;
  }

  // ── list ──────────────────────────────────────────────────────────────────

  list(query?: ModuleListQuery): ModuleListResult {
    const offset = query?.offset ?? 0;
    const limit  = query?.limit  ?? DEFAULT_LIST_LIMIT;

    const matched: ModuleRecord[] = [];

    for (const record of this.store.values()) {
      if (!this.matchesQuery(record, query)) continue;
      matched.push(record);
    }

    matched.sort(byInstalledDateAscending);

    return {
      modules: matched.slice(offset, offset + limit),
      total:   matched.length,
      offset,
      limit,
    };
  }

  // ── count ─────────────────────────────────────────────────────────────────

  count(): number {
    return this.store.size;
  }

  // ── remove ────────────────────────────────────────────────────────────────

  remove(id: ModuleRecordId): boolean {
    const existing = this.store.get(id);
    if (existing === undefined) return false;

    this.keyIndex.delete(existing.moduleKey.toLowerCase());
    this.store.delete(id);
    return true;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private matchesQuery(record: ModuleRecord, query?: ModuleListQuery): boolean {
    if (query === undefined) return true;

    if (query.status !== undefined && record.status !== query.status) {
      return false;
    }

    if (query.searchText !== undefined && query.searchText.trim().length > 0) {
      const needle    = query.searchText.toLowerCase();
      const inName    = record.name.toLowerCase().includes(needle);
      const inKey     = record.moduleKey.toLowerCase().includes(needle);
      const inCat     = record.category.toLowerCase().includes(needle);
      if (!inName && !inKey && !inCat) return false;
    }

    return true;
  }
}

// ── Sorting helper ────────────────────────────────────────────────────────────

function byInstalledDateAscending(a: ModuleRecord, b: ModuleRecord): number {
  if (a.installedDate < b.installedDate) return -1;
  if (a.installedDate > b.installedDate) return 1;
  return 0;
}
