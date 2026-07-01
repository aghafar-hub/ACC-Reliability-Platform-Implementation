// platform/sdk/src/impl/local-storage-user-repository.ts
// localStorage-backed implementation of IUserRepository.
//
// Responsibilities:
//   - Persist all UserRecord state to browser localStorage so user creation,
//     edits, suspension, and archival survive page refresh.
//   - Mirror the same Map-based index structure used by InMemoryUserRepository
//     so the interface contract is identical.
//   - Gracefully degrade when localStorage is unavailable (quota exceeded,
//     private mode, SSR) — operations continue in-memory only.
//
// Storage key: platform.users.registry
//   Value: JSON array of UserRecord objects.
//
// This is a temporary persistence layer bridging Phase 1 (in-memory) and the
// planned Google Sheets provider (GoogleSheetsUserRepository — future sprint).
// The IUserRepository interface is unchanged; swapping providers requires
// only a bootstrap.ts change.

import { DuplicateEntityError, EntityNotFoundError } from '@acc-reliability/services';
import type {
  UserRecord,
  UserListQuery,
  UserListResult,
  IUserRepository,
} from '@acc-reliability/services';
import type { UserId, ContractorId } from '@acc-reliability/services';

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY        = 'platform.users.registry';
const DEFAULT_LIST_LIMIT = 50;

// ── LocalStorageUserRepository ────────────────────────────────────────────────

/**
 * localStorage-backed implementation of the user repository.
 *
 * Storage format:
 *  - Primary store: `Map<userId, UserRecord>` (in-memory, rebuilt from localStorage on init).
 *  - Email index:   `Map<"contractorId:email", userId>` for O(1) lookup.
 *  - Persistence:   localStorage JSON array, written through on every mutation.
 *
 * All stored records are frozen with `Object.freeze` at write time (same as
 * InMemoryUserRepository).
 *
 * Next provider: GoogleSheetsUserRepository — replace this class in
 * bootstrap.ts once the Google Sheets adapter credentials are available.
 */
export class LocalStorageUserRepository implements IUserRepository {
  private readonly store      = new Map<string, UserRecord>();
  private readonly emailIndex = new Map<string, string>();

  constructor() {
    this.hydrate();
  }

  // ── save ──────────────────────────────────────────────────────────────────

  save(user: UserRecord): UserRecord {
    if (this.store.has(user.userId)) {
      throw new DuplicateEntityError(
        `User '${user.userId}' already exists`,
        { userId: user.userId },
      );
    }

    const emailKey = this.emailKey(user.email, user.contractorId);
    if (this.emailIndex.has(emailKey)) {
      throw new DuplicateEntityError(
        `Email '${user.email}' already exists in contractor '${user.contractorId}'`,
        { email: user.email, contractorId: user.contractorId },
      );
    }

    const frozen = Object.freeze({ ...user });
    this.store.set(user.userId, frozen);
    this.emailIndex.set(emailKey, user.userId);
    this.persist();
    return frozen;
  }

  // ── update ────────────────────────────────────────────────────────────────

  update(user: UserRecord): UserRecord {
    const existing = this.store.get(user.userId);
    if (existing === undefined) {
      throw new EntityNotFoundError(
        `User '${user.userId}' not found`,
        { userId: user.userId },
      );
    }

    if (existing.email !== user.email || existing.contractorId !== user.contractorId) {
      const oldKey = this.emailKey(existing.email, existing.contractorId);
      const newKey = this.emailKey(user.email, user.contractorId);

      if (this.emailIndex.has(newKey) && this.emailIndex.get(newKey) !== user.userId) {
        throw new DuplicateEntityError(
          `Email '${user.email}' already exists in contractor '${user.contractorId}'`,
          { email: user.email, contractorId: user.contractorId },
        );
      }

      this.emailIndex.delete(oldKey);
      this.emailIndex.set(newKey, user.userId);
    }

    const frozen = Object.freeze({ ...user });
    this.store.set(user.userId, frozen);
    this.persist();
    return frozen;
  }

  // ── findById ──────────────────────────────────────────────────────────────

  findById(userId: UserId): UserRecord | null {
    return this.store.get(userId) ?? null;
  }

  // ── findByEmail ───────────────────────────────────────────────────────────

  findByEmail(email: string, contractorId: ContractorId): UserRecord | null {
    const userId = this.emailIndex.get(this.emailKey(email, contractorId));
    if (userId === undefined) return null;
    return this.store.get(userId) ?? null;
  }

  // ── list ──────────────────────────────────────────────────────────────────

  list(query?: UserListQuery): UserListResult {
    const offset = query?.offset ?? 0;
    const limit  = query?.limit  ?? DEFAULT_LIST_LIMIT;

    const matched: UserRecord[] = [];

    for (const record of this.store.values()) {
      if (!this.matchesQuery(record, query)) continue;
      matched.push(record);
    }

    matched.sort(byCreatedAtAscending);

    return {
      users:  matched.slice(offset, offset + limit),
      total:  matched.length,
      offset,
      limit,
    };
  }

  // ── count ─────────────────────────────────────────────────────────────────

  count(contractorId?: ContractorId): number {
    if (contractorId === undefined) return this.store.size;
    let n = 0;
    for (const record of this.store.values()) {
      if (record.contractorId === contractorId) n++;
    }
    return n;
  }

  // ── remove ────────────────────────────────────────────────────────────────

  remove(userId: UserId): boolean {
    const existing = this.store.get(userId);
    if (existing === undefined) return false;

    const emailKey = this.emailKey(existing.email, existing.contractorId);
    this.emailIndex.delete(emailKey);
    this.store.delete(userId);
    this.persist();
    return true;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private emailKey(email: string, contractorId: ContractorId): string {
    return `${contractorId}:${email.toLowerCase()}`;
  }

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

      const records = JSON.parse(raw) as UserRecord[];
      if (!Array.isArray(records)) return;

      for (const record of records) {
        if (!record || typeof record.userId !== 'string' || typeof record.email !== 'string') {
          continue;
        }
        const frozen = Object.freeze({ ...record });
        this.store.set(record.userId, frozen);
        this.emailIndex.set(this.emailKey(record.email, record.contractorId), record.userId);
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

  private matchesQuery(record: UserRecord, query?: UserListQuery): boolean {
    if (query === undefined) return true;

    if (query.contractorId !== undefined && record.contractorId !== query.contractorId) {
      return false;
    }

    if (query.status !== undefined && record.status !== query.status) {
      return false;
    }

    if (query.role !== undefined) {
      const hasRole = record.roles.some((ra) => ra.role === query.role);
      if (!hasRole) return false;
    }

    if (query.searchText !== undefined && query.searchText.trim().length > 0) {
      const needle  = query.searchText.toLowerCase();
      const inName  = record.displayName.toLowerCase().includes(needle);
      const inEmail = record.email.toLowerCase().includes(needle);
      if (!inName && !inEmail) return false;
    }

    return true;
  }
}

// ── Sorting helper ────────────────────────────────────────────────────────────

function byCreatedAtAscending(a: UserRecord, b: UserRecord): number {
  if (a.createdAt < b.createdAt) return -1;
  if (a.createdAt > b.createdAt) return 1;
  return 0;
}
