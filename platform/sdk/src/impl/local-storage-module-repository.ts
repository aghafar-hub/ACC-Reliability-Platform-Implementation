// platform/sdk/src/impl/local-storage-module-repository.ts
// localStorage-backed implementation of IModuleRepository.
//
// Responsibilities:
//   - Persist all ModuleRecord state to browser localStorage so lifecycle
//     changes (enable, disable, maintenance, retire, restore) survive refresh.
//   - Mirror the same Map-based index structure used by InMemoryModuleRepository
//     so the interface contract is identical.
//   - Gracefully degrade when localStorage is unavailable (quota exceeded,
//     private mode, SSR) — operations continue in-memory only.
//
// Storage key: platform.modules.registry
//   Value: JSON array of ModuleRecord objects.
//
// This is a temporary persistence layer bridging Phase 1 (in-memory) and the
// planned Google Sheets provider (GoogleSheetsModuleRepository — future sprint).
// The IModuleRepository interface is unchanged; swapping providers requires
// only a bootstrap.ts change.

import { DuplicateEntityError, EntityNotFoundError } from '@acc-reliability/services';
import type {
  ModuleRecord,
  ModuleRecordId,
  ModuleListQuery,
  ModuleListResult,
  IModuleRepository,
} from '@acc-reliability/services';

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY        = 'platform.modules.registry';
const DEFAULT_LIST_LIMIT = 50;

// ── LocalStorageModuleRepository ──────────────────────────────────────────────

/**
 * localStorage-backed implementation of the module repository.
 *
 * Storage format:
 *  - Primary store: `Map<id, ModuleRecord>` (in-memory, rebuilt from localStorage on init).
 *  - Key index:     `Map<moduleKey.toLowerCase(), id>` for O(1) lookup.
 *  - Persistence:   localStorage JSON array, written through on every mutation.
 *
 * All stored records are frozen with `Object.freeze` at write time (same as
 * InMemoryModuleRepository).
 *
 * Next provider: GoogleSheetsModuleRepository — replace this class in
 * bootstrap.ts once the Google Sheets adapter credentials are available.
 */
export class LocalStorageModuleRepository implements IModuleRepository {
  private readonly store    = new Map<string, ModuleRecord>();
  private readonly keyIndex = new Map<string, string>();

  constructor() {
    this.hydrate();
  }

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
    this.persist();
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
    this.persist();
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
    this.persist();
    return true;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Reads the persisted JSON array from localStorage and populates the
   * in-memory Maps.  Called once in the constructor.
   *
   * Silently ignores malformed JSON or localStorage access errors so the
   * application still starts cleanly in private mode or when storage is full.
   */
  private hydrate(): void {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === null) return;

      const records = JSON.parse(raw) as ModuleRecord[];
      if (!Array.isArray(records)) return;

      for (const record of records) {
        if (!record || typeof record.id !== 'string' || typeof record.moduleKey !== 'string') {
          continue;
        }
        const frozen = Object.freeze({ ...record });
        this.store.set(record.id, frozen);
        this.keyIndex.set(record.moduleKey.toLowerCase(), record.id);
      }
    } catch {
      // localStorage unavailable or corrupted — start empty, seed will populate.
    }
  }

  /**
   * Serialises the current store to localStorage.
   * Silently ignores write failures (quota exceeded, private mode).
   */
  private persist(): void {
    try {
      const records = Array.from(this.store.values());
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // Quota exceeded or access blocked — state is still correct in-memory.
    }
  }

  private matchesQuery(record: ModuleRecord, query?: ModuleListQuery): boolean {
    if (query === undefined) return true;

    if (query.status !== undefined && record.status !== query.status) {
      return false;
    }

    if (query.searchText !== undefined && query.searchText.trim().length > 0) {
      const needle  = query.searchText.toLowerCase();
      const inName  = record.name.toLowerCase().includes(needle);
      const inKey   = record.moduleKey.toLowerCase().includes(needle);
      const inCat   = record.category.toLowerCase().includes(needle);
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
