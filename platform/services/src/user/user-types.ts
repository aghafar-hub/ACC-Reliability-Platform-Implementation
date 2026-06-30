// platform/services/src/user/user-types.ts
// User domain entity, DTOs, repository and service contracts.
//
// Design:
//   - UserRecord is the platform's authoritative stored user entity.
//     It is distinct from UserContext (an auth-session snapshot that lives only
//     while a session is active).  UserRecord persists independently of the
//     authentication provider — Entra ID, Keycloak, LDAP, or any future IdP
//     may authenticate; UserRecord owns the platform-side identity.
//
//   - RoleAssignment supports three sub-types:
//       Permanent:  expiresAt and delegatedBy absent.
//       Temporary:  expiresAt set; expired on next expireTemporaryRoles() call.
//       Delegated:  delegatedBy and delegationId set; ended explicitly.
//
//   - ActorRef is a lightweight principal reference — minimal identity needed by
//     service methods.  Callers derive it from a UserContext.
//
// Service id reserved: platform.identity

import type { UserId, ContractorId, UserRole } from '../auth/auth-types';

// ── UserStatus ────────────────────────────────────────────────────────────────

/** Ordered tuple of all valid user lifecycle states. */
export const USER_STATUSES = ['active', 'suspended', 'archived'] as const;

/** Lifecycle state of a platform user account. */
export type UserStatus = typeof USER_STATUSES[number];

// ── DelegationId ──────────────────────────────────────────────────────────────

declare const DelegationIdBrand: unique symbol;

/**
 * Branded string that uniquely identifies a single role delegation instance.
 * Use {@link createDelegationId} or {@link generateDelegationId} to produce values.
 */
export type DelegationId = string & { readonly [DelegationIdBrand]: 'DelegationId' };

/** Creates a {@link DelegationId} from a plain string. @throws {Error} if blank. */
export function createDelegationId(value: string): DelegationId {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error('DelegationId cannot be empty');
  return trimmed as DelegationId;
}

/** Generates a time-ordered {@link DelegationId}. */
export function generateDelegationId(): DelegationId {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 9);
  return createDelegationId(`del-${ts}-${rnd}`);
}

// ── UserId generation ─────────────────────────────────────────────────────────

/**
 * Generates a platform-unique {@link UserId} without external input.
 * Uses the same branded type as auth-types.ts so UserRecord.userId and
 * UserContext.userId are type-compatible.
 */
export function generateUserRecordId(): UserId {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 11);
  return `usr-${ts}-${rnd}` as UserId;
}

// ── ActorRef ──────────────────────────────────────────────────────────────────

/**
 * Minimal actor reference required by user service operations.
 *
 * Callers derive this from a {@link UserContext} (same fields).  Keeping it
 * lightweight avoids forcing service callers to supply unused session fields.
 */
export interface ActorRef {
  readonly userId: UserId;
  readonly contractorId: ContractorId;
}

// ── RoleAssignment ────────────────────────────────────────────────────────────

/**
 * A single role assignment on a {@link UserRecord}.
 *
 * Three sub-types are distinguished by the presence/absence of optional fields:
 *  - Permanent  — no `expiresAt`, no `delegatedBy`.
 *  - Temporary  — `expiresAt` is set; expired automatically.
 *  - Delegated  — `delegatedBy` and `delegationId` are set; ended explicitly.
 */
export interface RoleAssignment {
  /** The granted role. */
  readonly role: UserRole;
  /** ISO 8601 timestamp when this assignment was created. */
  readonly assignedAt: string;
  /** User who created this assignment. */
  readonly assignedBy: UserId;
  /** ISO 8601 timestamp when this role expires. Present for temporary roles only. */
  readonly expiresAt?: string;
  /** User who delegated this role. Present for delegated roles only. */
  readonly delegatedBy?: UserId;
  /** Unique identifier for this delegation. Present for delegated roles only. */
  readonly delegationId?: DelegationId;
  /** Human-readable reason for this assignment. */
  readonly reason?: string;
}

// ── UserRecord ────────────────────────────────────────────────────────────────

/**
 * Authoritative platform user entity.
 *
 * Invariants:
 *  - userId is unique across the entire platform.
 *  - email is unique within a contractor scope.
 *  - roles is the complete list of all current assignments (permanent + temporary + delegated).
 *  - Archived users cannot receive new role assignments until restored.
 *  - Suspended users retain roles but cannot perform platform operations.
 *  - All fields are readonly — mutations produce new records (immutable update pattern).
 */
export interface UserRecord {
  readonly userId: UserId;
  readonly contractorId: ContractorId;
  readonly email: string;
  readonly displayName: string;
  readonly status: UserStatus;
  readonly roles: readonly RoleAssignment[];
  readonly createdAt: string;
  readonly createdBy: UserId;
  readonly updatedAt: string;
  readonly updatedBy: UserId;
  readonly archivedAt?: string;
  readonly archivedBy?: UserId;
  readonly archivedReason?: string;
  readonly suspendedAt?: string;
  readonly suspendedBy?: UserId;
  readonly suspendedReason?: string;
  readonly restoredAt?: string;
  readonly restoredBy?: UserId;
  readonly activatedAt?: string;
  readonly activatedBy?: UserId;
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

/** Fields required to create a new user account. */
export interface CreateUserRequest {
  /**
   * Optional explicit user id.  If omitted, {@link generateUserRecordId} is used.
   * Callers that integrate with an external IdP may supply the provider's user id.
   */
  readonly userId?: UserId;
  readonly contractorId: ContractorId;
  readonly email: string;
  readonly displayName: string;
  /** Initial role assignments.  Defaults to an empty list. */
  readonly roles?: readonly UserRole[];
  readonly reason?: string;
}

/** Profile fields that may be updated on an existing user account. */
export interface UpdateUserRequest {
  readonly email?: string;
  readonly displayName?: string;
  readonly reason?: string;
}

/** Request to assign a permanent role to a user. */
export interface AssignRoleRequest {
  readonly role: UserRole;
  readonly reason?: string;
}

/** Request to assign a temporary (time-limited) role to a user. */
export interface AssignTemporaryRoleRequest {
  readonly role: UserRole;
  /** ISO 8601 timestamp when the role will expire. Must be in the future. */
  readonly expiresAt: string;
  readonly reason?: string;
}

/**
 * Request to create a role delegation from `delegatedBy` to the target user.
 * The target user receives the role for the duration of the delegation.
 */
export interface CreateDelegationRequest {
  readonly role: UserRole;
  /** User who is delegating their role. */
  readonly delegatedBy: UserId;
  /** ISO 8601 timestamp when the delegation expires.  Optional. */
  readonly expiresAt?: string;
  readonly reason?: string;
}

/** Filter criteria for listing user accounts. */
export interface UserListQuery {
  /** Filter by contractor. */
  readonly contractorId?: ContractorId;
  /** Filter by lifecycle status. */
  readonly status?: UserStatus;
  /** Filter by role — returns users who hold the given role. */
  readonly role?: UserRole;
  /** Full-text search against displayName and email. */
  readonly searchText?: string;
  /** Number of records to skip (pagination). Defaults to 0. */
  readonly offset?: number;
  /** Maximum number of records to return. Defaults to 50. */
  readonly limit?: number;
}

/** Paginated result from a user list operation. */
export interface UserListResult {
  readonly users: readonly UserRecord[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
}

// ── IUserRepository ───────────────────────────────────────────────────────────

/**
 * User repository contract — raw data access layer.
 *
 * No business rules are enforced here; enforcement is the responsibility of
 * {@link IUserService}.  Implementations may be in-memory (current) or
 * SQL-backed (future migration).
 *
 * Service id reserved: `platform.identity.repository`
 */
export interface IUserRepository {
  /**
   * Stores a new user record.
   * @throws {Error} if userId is already taken.
   */
  save(user: UserRecord): UserRecord;

  /**
   * Replaces an existing user record.
   * @throws {Error} if userId is not found.
   */
  update(user: UserRecord): UserRecord;

  /** Returns the user with the given id, or `null` if not found. */
  findById(userId: UserId): UserRecord | null;

  /**
   * Returns the user with the given email within the contractor scope,
   * or `null` if not found.
   */
  findByEmail(email: string, contractorId: ContractorId): UserRecord | null;

  /** Returns a paginated list of users matching the supplied filter. */
  list(query?: UserListQuery): UserListResult;

  /** Returns the total number of stored users, optionally scoped to a contractor. */
  count(contractorId?: ContractorId): number;

  /**
   * Hard-deletes a user record.
   * Reserved for integration tests — production lifecycle uses archive.
   * Returns `true` if the record was found and removed.
   */
  remove(userId: UserId): boolean;
}

// ── IUserService ──────────────────────────────────────────────────────────────

/**
 * User Management Service contract.
 *
 * Owns the full user lifecycle: create, update, archive, restore, suspend,
 * activate.  Also manages role assignments including temporary and delegated roles.
 *
 * Every mutation:
 *  - Writes an audit record via the platform audit service.
 *  - Publishes a domain event via the platform event bus.
 *    (NullEventBus in Phase 1 — real delivery in Phase 9.)
 *
 * Authentication is explicitly NOT a concern of this service.  The identity
 * provider supplies authentication; this service owns the user record.
 *
 * Service id reserved for registration: `platform.identity`
 */
export interface IUserService {
  // ── CRUD ─────────────────────────────────────────────────────────────────

  /**
   * Creates a new user account and publishes {@link UserCreatedEvent}.
   * @throws {UserDuplicateError} if email is already taken within the contractor scope.
   */
  create(request: CreateUserRequest, actor: ActorRef): UserRecord;

  /** Returns the user with the given id, or `null` if not found. */
  findById(userId: UserId): UserRecord | null;

  /** Returns the user with the given email and contractor, or `null`. */
  findByEmail(email: string, contractorId: ContractorId): UserRecord | null;

  /** Returns a paginated list of users matching the query. */
  list(query?: UserListQuery): UserListResult;

  /**
   * Updates user profile fields and publishes {@link UserUpdatedEvent}.
   * @throws {UserNotFoundError} if the user does not exist.
   */
  update(userId: UserId, request: UpdateUserRequest, actor: ActorRef): UserRecord;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Archives a user account.  The account becomes inactive; active roles are
   * retained but inactive while archived.  Publishes {@link UserArchivedEvent}.
   * @throws {UserNotFoundError} if the user does not exist.
   * @throws {UserLifecycleError} if the user is already archived.
   */
  archive(userId: UserId, reason: string, actor: ActorRef): UserRecord;

  /**
   * Restores an archived user to active status.  Publishes {@link UserRestoredEvent}.
   * @throws {UserNotFoundError} if the user does not exist.
   * @throws {UserLifecycleError} if the user is not archived.
   */
  restore(userId: UserId, actor: ActorRef): UserRecord;

  /**
   * Suspends a user.  The user retains their account and roles but cannot
   * perform platform operations.  Publishes {@link UserSuspendedEvent}.
   * @throws {UserNotFoundError} if the user does not exist.
   * @throws {UserLifecycleError} if the user is archived or already suspended.
   */
  suspend(userId: UserId, reason: string, actor: ActorRef): UserRecord;

  /**
   * Activates a suspended user, returning them to active status.
   * Publishes {@link UserActivatedEvent}.
   * @throws {UserNotFoundError} if the user does not exist.
   * @throws {UserLifecycleError} if the user is not suspended.
   */
  activate(userId: UserId, actor: ActorRef): UserRecord;

  // ── Role management ───────────────────────────────────────────────────────

  /**
   * Assigns a permanent role.  Idempotent — no-op if the user already holds
   * an identical permanent assignment.  Publishes {@link RoleAssignedEvent}.
   * @throws {UserNotFoundError} if the user does not exist.
   * @throws {UserLifecycleError} if the user is archived.
   */
  assignRole(userId: UserId, request: AssignRoleRequest, actor: ActorRef): UserRecord;

  /**
   * Removes all assignments for the given role (permanent, temporary, delegated).
   * Idempotent — no-op if the user does not hold that role.
   * Publishes {@link RoleRemovedEvent}.
   * @throws {UserNotFoundError} if the user does not exist.
   */
  removeRole(userId: UserId, role: UserRole, actor: ActorRef): UserRecord;

  /**
   * Assigns a temporary role that expires at `expiresAt`.
   * Publishes {@link TemporaryRoleStartedEvent}.
   * @throws {UserNotFoundError} if the user does not exist.
   * @throws {UserLifecycleError} if the user is archived.
   */
  assignTemporaryRole(
    userId: UserId,
    request: AssignTemporaryRoleRequest,
    actor: ActorRef,
  ): UserRecord;

  /**
   * Creates a role delegation — grants `request.role` to the target user on
   * behalf of `request.delegatedBy`.  Publishes {@link DelegationCreatedEvent}.
   * @throws {UserNotFoundError} if the target user does not exist.
   * @throws {UserLifecycleError} if the target user is archived.
   */
  createDelegation(
    userId: UserId,
    request: CreateDelegationRequest,
    actor: ActorRef,
  ): UserRecord;

  /**
   * Ends a role delegation identified by `delegationId`.
   * The delegated role is removed from the user.  Publishes {@link DelegationEndedEvent}.
   * @throws {UserNotFoundError} if the user does not exist or the delegation is not found.
   */
  endDelegation(
    userId: UserId,
    delegationId: DelegationId,
    actor: ActorRef,
  ): UserRecord;

  /**
   * Scans all role assignments for the given user and removes any whose
   * `expiresAt` is in the past.  Publishes {@link TemporaryRoleExpiredEvent}
   * for each expired role.
   *
   * Returns the updated record, or `null` if the user is not found.
   * Never throws — designed to be called by a scheduler.
   */
  expireTemporaryRoles(userId: UserId): UserRecord | null;
}
