// platform/services/src/user/user-repository.ts
// In-memory implementation of IUserRepository.
//
// Responsibilities:
//   - Append-once save, replace-in-place update, keyed by UserId.
//   - Email uniqueness index per contractor scope.
//   - AND-filtered list queries with offset/limit pagination.
//   - Full-text search on displayName and email (case-insensitive substring).
//
// Non-responsibilities:
//   - Business rules (enforced by UserService).
//   - Audit recording (UserService responsibility).
//   - Durable persistence (SQL migration hook reserved for a future milestone).

import type { UserId, ContractorId, UserRole } from '../auth/auth-types';
import { DuplicateEntityError, EntityNotFoundError } from '../errors';
import type {
  UserRecord,
  UserListQuery,
  UserListResult,
  IUserRepository,
} from './user-types';

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_LIST_LIMIT = 50;

// ── InMemoryUserRepository ────────────────────────────────────────────────────

/**
 * In-memory implementation of the user repository.
 *
 * Storage:
 *  - Primary store: `Map<userId, UserRecord>` preserves insertion order.
 *  - Email index: `Map<"contractorId:email", UserId>` for O(1) lookup.
 *
 * All stored records are frozen with `Object.freeze` at write time.
 */
export class InMemoryUserRepository implements IUserRepository {
  private readonly store = new Map<string, UserRecord>();
  private readonly emailIndex = new Map<string, string>();

  // ── save ──────────────────────────────────────────────────────────────────

  /**
   * Stores a new user record.
   * @throws {DuplicateEntityError} if the userId or email (within contractor) is already taken.
   */
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
    return frozen;
  }

  // ── update ────────────────────────────────────────────────────────────────

  /**
   * Replaces an existing user record.
   * @throws {EntityNotFoundError} if the userId is not found.
   * @throws {DuplicateEntityError} if the new email conflicts with another user.
   */
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
    return true;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private emailKey(email: string, contractorId: ContractorId): string {
    return `${contractorId}:${email.toLowerCase()}`;
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
      const needle = query.searchText.toLowerCase();
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
