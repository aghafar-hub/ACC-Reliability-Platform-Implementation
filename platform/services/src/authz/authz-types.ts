// platform/services/src/authz/authz-types.ts
// Authorization and permission contracts for the ACC Reliability Platform.
//
// Design constraints:
//  - AppRole is an open union — module-specific or future roles extend freely.
//  - ContractorScope enforces contractor isolation at the authorization layer.
//  - PermissionRequest is structural; callers never construct raw strings for
//    comparison.
//  - IPermissionService is interface-only; no implementation in this milestone.
//    The service id `platform.permissions` is reserved for a future milestone.

import type { ContractorId, UserContext } from '../auth/auth-types';

// ── App roles ─────────────────────────────────────────────────────────────────

/**
 * Platform role assigned to a user.
 *
 * Role semantics (authoritative):
 *  - AppOwner            — full platform access across all contractors and modules.
 *  - Manager             — read, write, and approve within their contractor scope.
 *  - Engineer            — read and write within their contractor scope; cannot approve.
 *  - ContractorManager   — manages users and data within a single contractor boundary.
 *  - ContractorEngineer  — engineer rights scoped strictly to their own contractor.
 *  - Viewer              — read-only access across permitted modules.
 *
 * The `string` extension keeps the union open for future contractor-specific
 * or module-specific roles without requiring a platform-wide schema change.
 * IntelliSense still surfaces the known literals.
 */
export type AppRole =
  | 'AppOwner'
  | 'Manager'
  | 'Engineer'
  | 'ContractorManager'
  | 'ContractorEngineer'
  | 'Viewer'
  | (string & Record<never, never>);

/** Built-in platform roles, ordered from highest to lowest authority. */
export const PLATFORM_ROLES = [
  'AppOwner',
  'Manager',
  'Engineer',
  'ContractorManager',
  'ContractorEngineer',
  'Viewer',
] as const;

/** Union of the built-in platform role literals. */
export type KnownAppRole = typeof PLATFORM_ROLES[number];

// ── Contractor scope ──────────────────────────────────────────────────────────

/**
 * Scope of a permission check relative to a contractor.
 *
 *  - A {@link ContractorId} value — permission applies to that specific contractor only.
 *  - `'all'`              — permission applies across all contractors; only
 *                           users with the `AppOwner` role can satisfy `'all'`-scoped checks.
 *
 * New contractors (beyond ACC, RHI, ASEC) are supported transparently because
 * the scope is typed as {@link ContractorId}, which accepts any normalised string.
 */
export type ContractorScope = ContractorId | 'all';

// ── Module identifiers ────────────────────────────────────────────────────────

/** Built-in business modules registered in the platform. */
export const KNOWN_MODULES = [
  'oil-lubrication',
  'oil-analysis',
  'vibration-analysis',
  'compressors',
  'reliability-measurements',
] as const;

/** Union of the built-in module identifier literals. */
export type KnownModuleId = typeof KNOWN_MODULES[number];

/**
 * Business module identifier.
 *
 * Use a {@link KnownModuleId} for built-in modules; the `string` extension
 * allows future modules to be onboarded without breaking existing permission
 * checks.
 */
export type ModuleId = KnownModuleId | (string & Record<never, never>);

// ── Action types ──────────────────────────────────────────────────────────────

/** Platform-wide action verbs that can be granted per module. */
export const KNOWN_ACTIONS = [
  'read',
  'create',
  'update',
  'delete',
  'approve',
  'export',
  'configure',
] as const;

/** Union of the built-in action type literals. */
export type KnownActionType = typeof KNOWN_ACTIONS[number];

/**
 * Action type used in permission requests and grants.
 *
 * Use a {@link KnownActionType} whenever possible; the `string` extension
 * allows module-specific actions (e.g. `'oil-lubrication.calibrate'`) to be
 * added without a platform-wide schema change.
 */
export type ActionType = KnownActionType | (string & Record<never, never>);

// ── Permission structures ─────────────────────────────────────────────────────

/**
 * A single resolved permission entry that has been granted to a user.
 *
 * Produced by {@link IPermissionService.getGrantedPermissions}; never
 * constructed directly by callers outside the permission service.
 */
export interface PermissionEntry {
  /** The module this permission covers. */
  readonly moduleId: ModuleId;
  /** The action that is permitted. */
  readonly action: ActionType;
  /**
   * Contractor scope for which this permission is valid.
   * `'all'` is only present in entries for `AppOwner` users.
   */
  readonly contractorScope: ContractorScope;
}

/**
 * Describes a single permission check: "can this user perform `action` on
 * `moduleId` for `contractorScope`?"
 *
 * Pass to {@link IPermissionService.hasPermission}.
 */
export interface PermissionRequest {
  /** Module being accessed. */
  readonly moduleId: ModuleId;
  /** Action being attempted. */
  readonly action: ActionType;
  /**
   * Contractor context of the resource being accessed.
   *
   * Must match the calling user's own {@link ContractorId} unless they hold
   * the `AppOwner` role.  Passing a contractor other than the user's own
   * will return `false` (not throw) for non-AppOwner users.
   */
  readonly contractorScope: ContractorScope;
}

// ── IPermissionService ────────────────────────────────────────────────────────

/**
 * Authorization and permission service contract.
 *
 * Business modules consume this interface; they never depend on a concrete
 * implementation.  The implementation is resolved from the Service Registry
 * under the service id `platform.permissions`.
 *
 * All methods are synchronous because permission checks are on the hot path of
 * every module operation.  Implementations must pre-load and cache the
 * effective permission set when the user session is established.
 *
 * Design invariants:
 *  - A user may only access data within their own contractor scope unless they
 *    hold the `AppOwner` role.
 *  - Effective permissions are derived from roles stored in {@link UserContext};
 *    callers never mutate permissions directly.
 *  - The service id `platform.permissions` is reserved; no registration occurs
 *    in this milestone (no implementation exists yet).
 *
 * Future: when the Event Bus is active, role changes will publish to
 * `platform.events.permissions.roles-changed` so dependent services can
 * invalidate caches without polling.
 */
export interface IPermissionService {
  /**
   * Returns `true` if the user currently holds the given role.
   *
   * @param user Authenticated user context.
   * @param role Role to test against.
   */
  hasRole(user: UserContext, role: AppRole): boolean;

  /**
   * Returns `true` if the user's effective permissions satisfy the given
   * {@link PermissionRequest}.
   *
   * Contractor isolation is enforced: a user without the `AppOwner` role
   * can only satisfy checks where `request.contractorScope` matches
   * `user.contractorId`.  Cross-contractor requests return `false`, not an
   * error.
   *
   * @param user    Authenticated user context.
   * @param request Describes the action, module, and contractor scope to check.
   */
  hasPermission(user: UserContext, request: PermissionRequest): boolean;

  /**
   * Returns the full list of resolved {@link PermissionEntry} objects effective
   * for the user.
   *
   * Entries are scoped to the user's contractor unless the user holds the
   * `AppOwner` role, in which case cross-contractor entries may be included.
   *
   * @param user Authenticated user context.
   */
  getGrantedPermissions(user: UserContext): readonly PermissionEntry[];

  /**
   * Returns `true` if the user is permitted to load and interact with the
   * specified module (any action, within their contractor scope).
   *
   * Modules use this for coarse-grained access control before rendering UI
   * or accepting service calls.
   *
   * @param user     Authenticated user context.
   * @param moduleId Module to check access for.
   */
  canAccessModule(user: UserContext, moduleId: ModuleId): boolean;

  /**
   * Returns the roles currently assigned to the user, derived from
   * {@link UserContext.roles} and normalised to {@link AppRole}.
   *
   * @param user Authenticated user context.
   */
  getRoles(user: UserContext): readonly AppRole[];
}
