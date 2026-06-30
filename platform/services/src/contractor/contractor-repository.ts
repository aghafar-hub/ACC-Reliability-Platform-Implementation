// platform/services/src/contractor/contractor-repository.ts
// In-memory implementation of IContractorRepository.
//
// Responsibilities:
//   - Append-once save, replace-in-place update, keyed by ContractorRecordId.
//   - Contractor code uniqueness index for O(1) lookup.
//   - AND-filtered list queries with offset/limit pagination.
//   - Full-text search on name, shortName, contractorCode (case-insensitive substring).
//
// Non-responsibilities:
//   - Business rules (enforced by ContractorService).
//   - Audit recording (ContractorService responsibility).
//   - Durable persistence (SQL migration hook reserved for a future milestone).

import type { ContractorId } from '../auth/auth-types';
import { DuplicateEntityError, EntityNotFoundError } from '../errors';
import type {
  ContractorRecord,
  ContractorRecordId,
  ContractorListQuery,
  ContractorListResult,
  IContractorRepository,
} from './contractor-types';

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_LIST_LIMIT = 50;

// ── InMemoryContractorRepository ──────────────────────────────────────────────

/**
 * In-memory implementation of the contractor repository.
 *
 * Storage:
 *  - Primary store: `Map<id, ContractorRecord>` preserves insertion order.
 *  - Code index:    `Map<contractorCode, id>` for O(1) lookup.
 *
 * All stored records are frozen with `Object.freeze` at write time.
 */
export class InMemoryContractorRepository implements IContractorRepository {
  private readonly store      = new Map<string, ContractorRecord>();
  private readonly codeIndex  = new Map<string, string>();

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
    return true;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private matchesQuery(record: ContractorRecord, query?: ContractorListQuery): boolean {
    if (query === undefined) return true;

    if (query.status !== undefined && record.status !== query.status) {
      return false;
    }

    if (query.searchText !== undefined && query.searchText.trim().length > 0) {
      const needle   = query.searchText.toLowerCase();
      const inName   = record.name.toLowerCase().includes(needle);
      const inShort  = record.shortName.toLowerCase().includes(needle);
      const inCode   = record.contractorCode.toLowerCase().includes(needle);
      const inEmail  = record.email.toLowerCase().includes(needle);
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
