// platform/sdk/src/clients/permissions-client.ts
// SDK permissions client interface.
//
// Business modules use IPermissionsClient to check roles, permissions, and
// feature availability.  The SDK binds the current user from SdkContext so
// modules never need to pass a UserContext parameter explicitly (PS-114 §6).

import type {
  AppRole,
  PermissionRequest,
  PermissionEntry,
  ModuleId,
} from '@acc-reliability/services';

/**
 * SDK permissions and authorization client.
 *
 * All methods evaluate against the currently authenticated user held in
 * {@link SdkContext}.  Business modules must call these methods before every
 * protected operation; they must not cache permission results locally.
 *
 * Contractor isolation is enforced at the service layer; modules do not
 * need to apply contractor filtering manually.
 */
export interface IPermissionsClient {
  /**
   * Returns `true` if the current user holds the specified role.
   *
   * @param role Platform role to test.
   */
  hasRole(role: AppRole): boolean;

  /**
   * Returns `true` if the current user's effective permissions satisfy the
   * given {@link PermissionRequest}.
   *
   * Contractor isolation is applied automatically: a non-AppOwner user cannot
   * satisfy a request whose `contractorScope` differs from their own.
   *
   * @param request Action, module, and contractor scope to check.
   */
  hasPermission(request: PermissionRequest): boolean;

  /**
   * Returns `true` if the current user is permitted to load and interact
   * with the specified module.
   *
   * @param moduleId Business module identifier.
   */
  canAccessModule(moduleId: ModuleId): boolean;

  /**
   * Returns the full list of resolved permission entries effective for the
   * current user.
   */
  getGrantedPermissions(): readonly PermissionEntry[];

  /**
   * Returns the roles currently assigned to the current user.
   */
  getRoles(): readonly AppRole[];

  /**
   * Returns `true` if the named platform feature flag is enabled.
   *
   * Modules must call this before rendering features that may be disabled
   * via configuration.  Modules must not implement feature evaluation logic.
   *
   * @param featureKey Stable feature identifier string (e.g. `'oil-analysis.ai-recommendations'`).
   */
  isFeatureEnabled(featureKey: string): boolean;
}
