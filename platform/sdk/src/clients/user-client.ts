// platform/sdk/src/clients/user-client.ts
// SDK User Management client interface.
//
// Business modules consume IUserClient; they never depend on UserService directly.
// The SDK layer hides the service implementation and ensures all user-management
// access flows through the approved SDK contract (PS-114 §5).
//
// IUserClient exposes a thin subset of IUserService:
//   - read operations open to any module
//   - write operations require the caller to be a platform-level actor
//
// Authentication-specific operations (sign-in, session, token refresh) are
// handled by IAuthClient — not this client.

import type { UserId, ContractorId, UserRole } from '@acc-reliability/services';
import type {
  UserRecord,
  UserStatus,
  RoleAssignment,
  DelegationId,
  CreateUserRequest,
  UpdateUserRequest,
  AssignRoleRequest,
  AssignTemporaryRoleRequest,
  CreateDelegationRequest,
  UserListQuery,
  UserListResult,
} from '@acc-reliability/services';

export type {
  UserRecord,
  UserStatus,
  RoleAssignment,
  DelegationId,
  CreateUserRequest,
  UpdateUserRequest,
  AssignRoleRequest,
  AssignTemporaryRoleRequest,
  CreateDelegationRequest,
  UserListQuery,
  UserListResult,
};

/**
 * SDK User Management client.
 *
 * Provides access to the platform User Management domain from business modules
 * and UI shells.  All mutating calls derive the acting user from the current
 * {@link SdkContext} — callers cannot impersonate other users.
 *
 * Rules:
 *  - Read operations (findById, findByEmail, list) are available regardless
 *    of the caller's role.
 *  - Write operations require the caller to have appropriate role (enforced
 *    by the permission service in a future milestone).
 *  - Role assignments on archived users are rejected.
 */
export interface IUserClient {
  // ── CRUD ─────────────────────────────────────────────────────────────────

  /**
   * Creates a new user account.
   * @throws {UserDuplicateError} if email is already taken within the contractor scope.
   */
  create(request: CreateUserRequest): UserRecord;

  /** Returns the user with the given id, or `null` if not found. */
  findById(userId: UserId): UserRecord | null;

  /** Returns the user with the given email and contractor, or `null`. */
  findByEmail(email: string, contractorId: ContractorId): UserRecord | null;

  /** Returns a paginated list of users matching the query. */
  list(query?: UserListQuery): UserListResult;

  /**
   * Updates user profile fields.
   * @throws {UserNotFoundError} if the user does not exist.
   */
  update(userId: UserId, request: UpdateUserRequest): UserRecord;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Archives a user account.
   * @throws {UserNotFoundError} if not found.
   * @throws {UserLifecycleError} if already archived.
   */
  archive(userId: UserId, reason: string): UserRecord;

  /**
   * Restores an archived user to active status.
   * @throws {UserNotFoundError} if not found.
   * @throws {UserLifecycleError} if not archived.
   */
  restore(userId: UserId): UserRecord;

  /**
   * Suspends a user account.
   * @throws {UserNotFoundError} if not found.
   * @throws {UserLifecycleError} if archived or already suspended.
   */
  suspend(userId: UserId, reason: string): UserRecord;

  /**
   * Activates a suspended user.
   * @throws {UserNotFoundError} if not found.
   * @throws {UserLifecycleError} if not suspended.
   */
  activate(userId: UserId): UserRecord;

  // ── Role management ───────────────────────────────────────────────────────

  /**
   * Assigns a permanent role to a user.
   * @throws {UserNotFoundError} if not found.
   * @throws {UserLifecycleError} if archived.
   */
  assignRole(userId: UserId, request: AssignRoleRequest): UserRecord;

  /**
   * Removes all assignments for the given role from a user.
   * @throws {UserNotFoundError} if not found.
   */
  removeRole(userId: UserId, role: UserRole): UserRecord;

  /**
   * Assigns a temporary (time-limited) role.
   * @throws {UserNotFoundError} if not found.
   * @throws {UserLifecycleError} if archived.
   */
  assignTemporaryRole(userId: UserId, request: AssignTemporaryRoleRequest): UserRecord;

  /**
   * Creates a role delegation to the target user.
   * @throws {UserNotFoundError} if target not found.
   * @throws {UserLifecycleError} if target is archived.
   */
  createDelegation(userId: UserId, request: CreateDelegationRequest): UserRecord;

  /**
   * Ends a role delegation by delegation id.
   * @throws {UserNotFoundError} if user or delegation not found.
   */
  endDelegation(userId: UserId, delegationId: DelegationId): UserRecord;

  /**
   * Scans a user's role assignments and removes any that have expired.
   * Returns the updated record, or `null` if the user is not found.
   * Never throws — safe to call from a scheduler.
   */
  expireTemporaryRoles(userId: UserId): UserRecord | null;
}
