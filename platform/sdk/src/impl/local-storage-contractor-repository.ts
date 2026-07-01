// platform/sdk/src/impl/local-storage-contractor-repository.ts
// localStorage-backed implementation of IContractorRepository.
//
// Responsibilities:
//   - Persist all ContractorRecord state to browser localStorage so contractor
//     creation, edits, suspension, and archival survive page refresh.
//   - Mirror the same Map-based index structure used by InMemoryContractorRepository
//     so the interface contract is identical.
//   - Gracefully degrade when localStorage is unavailable (quota exceeded,
//     private mode, SSR) — operations continue in-memory only.
//
// Storage key: platform.contractors.registry
//   Value: JSON array of ContractorRecord objects.
//
// This is a temporary persistence layer bridging Phase 1 (in-memory) and the
// planned Google Sheets provider (GoogleSheetsContractorRepository — future sprint).
// The IContractorRepository interface is unchanged; swapping providers requires
// only a bootstrap.ts change.

import { DuplicateEntityError, EntityNotFoundError } from '@acc-reliability/services';
import type {
  ContractorRecord,
  ContractorRecordId,
  ContractorListQuery,
  ContractorListResult,
  IContractorRepository,
} from '@acc-reliability/services';
import type { ContractorId } from '@acc-reliability/services';

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY        = 'platform.contractors.registry';
const DEFAULT_LIST_LIMIT = 50;

// ── LocalStorageContractorRepository ─────────────────────────────────────────

/**
 * localStorage-backed implementation of the contractor repository.
 *
 * Storage format:
 *  - Primary store: `Map<id, ContractorRecord>` (in-memory, rebuilt from localStorage on init).
 *  - Code index:    `Map<contractorCode.toUpperCase(), id>` for O(1) lookup.
 *  - Persistence:   localStorage JSON array, written through on every mutation.
 *
 * All stored records are frozen with `Object.freeze` at write time (same as
 * InMemoryContractorRepository).
 *
 * Next provider: GoogleSheetsContractorRepository — replace this class in
 * bootstrap.ts once the Google Sheets adapter credentials are available.
 */
export class LocalStorageContractorRepository implements IContractorRepository {
  private readonly store     = new Map<string, ContractorRecord>();
  private readonly codeIndex = new Map<string, string>();

  constructor() {
    this.hydrate();
  }

  // ── save ──────────────────────────────────────────────────────────────────

  save(contractor: ContractorRecord): ContractorRecord {
    if (this.store.has(contractor.id)) {
      throw new DuplicateEntityError(
        `Contractor record '${contractor.id}' already exists`,
        { id: contractor.id },
      );
    }

    const codeKey = contractor.contractorCode.toUpperCase();
    if (this.codeIndex.has(codeKey)) {
      throw new DuplicateEntityError(
        `Contractor code '${contractor.contractorCode}' already exists`,
        { contractorCode: contractor.contractorCode },
      );
    }

    const frozen = Object.freeze({ ...contractor });
    this.store.set(contractor.id, frozen);
    this.codeIndex.set(codeKey, contractor.id);
    this.persist();
    return frozen;
  }

  // ── update ────────────────────────────────────────────────────────────────

  update(contractor: ContractorRecord): ContractorRecord {
    const existing = this.store.get(contractor.id);
    if (existing === undefined) {
      throw new EntityNotFoundError(
        `Contractor record '${contractor.id}' not found`,
        { id: contractor.id },
      );
    }

    if (existing.contractorCode !== contractor.contractorCode) {
      const oldKey = existing.contractorCode.toUpperCase();
      const newKey = contractor.contractorCode.toUpperCase();

      if (this.codeIndex.has(newKey) && this.codeIndex.get(newKey) !== contractor.id) {
        throw new DuplicateEntityError(
          `Contractor code '${contractor.contractorCode}' already exists`,
          { contractorCode: contractor.contractorCode },
        );
      }

      this.codeIndex.delete(oldKey);
      this.codeIndex.set(newKey, contractor.id);
    }

    const frozen = Object.freeze({ ...contractor });
    this.store.set(contractor.id, frozen);
    this.persist();
    return frozen;
  }

  // ── findById ──────────────────────────────────────────────────────────────

  findById(id: ContractorRecordId): ContractorRecord | null {
    return this.store.get(id) ?? null;
  }

  // ── findByCode ────────────────────────────────────────────────────────────

  findByCode(contractorCode: ContractorId): ContractorRecord | null {
    const id = this.codeIndex.get(contractorCode.toUpperCase());
    if (id === undefined) return null;
    return this.store.get(id) ?? null;
  }

  // ── list ──────────────────────────────────────────────────────────────────

  list(query?: ContractorListQuery): ContractorListResult {
    const offset = query?.offset ?? 0;
    const limit  = query?.limit  ?? DEFAULT_LIST_LIMIT;

    const matched: ContractorRecord[] = [];

    for (const record of this.store.values()) {
      if (!this.matchesQuery(record, query)) continue;
      matched.push(record);
    }

    matched.sort(byCreatedAtAscending);

    return {
      contractors: matched.slice(offset, offset + limit),
      total:       matched.length,
      offset,
      limit,
    };
  }

  // ── count ─────────────────────────────────────────────────────────────────

  count(): number {
    return this.store.size;
  }

  // ── remove ────────────────────────────────────────────────────────────────

  remove(id: ContractorRecordId): boolean {
    const existing = this.store.get(id);
    if (existing === undefined) return false;

    this.codeIndex.delete(existing.contractorCode.toUpperCase());
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

      const records = JSON.parse(raw) as ContractorRecord[];
      if (!Array.isArray(records)) return;

      for (const record of records) {
        if (!record || typeof record.id !== 'string' || typeof record.contractorCode !== 'string') {
          continue;
        }
        const frozen = Object.freeze({ ...record });
        this.store.set(record.id, frozen);
        this.codeIndex.set(record.contractorCode.toUpperCase(), record.id);
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

  private matchesQuery(record: ContractorRecord, query?: ContractorListQuery): boolean {
    if (query === undefined) return true;

    if (query.status !== undefined && record.status !== query.status) {
      return false;
    }

    if (query.searchText !== undefined && query.searchText.trim().length > 0) {
      const needle  = query.searchText.toLowerCase();
      const inName  = record.name.toLowerCase().includes(needle);
      const inShort = record.shortName.toLowerCase().includes(needle);
      const inCode  = record.contractorCode.toLowerCase().includes(needle);
      const inEmail = record.email.toLowerCase().includes(needle);
      if (!inName && !inShort && !inCode && !inEmail) return false;
    }

    return true;
  }
}

// ── Sorting helper ────────────────────────────────────────────────────────────

function byCreatedAtAscending(a: ContractorRecord, b: ContractorRecord): number {
  if (a.createdAt < b.createdAt) return -1;
  if (a.createdAt > b.createdAt) return 1;
  return 0;
}
