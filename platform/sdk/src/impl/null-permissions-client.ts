// platform/sdk/src/impl/null-permissions-client.ts
// Placeholder IPermissionsClient — authorization is not yet implemented.
//
// - hasRole / hasPermission return false (deny-by-default).
// - canAccessModule returns true so the bootstrap can proceed without auth.
// - getGrantedPermissions / getRoles return empty arrays.
// - isFeatureEnabled returns false (all features off by default).
//
// Replace with a real implementation in the authorization milestone.

import type {
  AppRole,
  PermissionEntry,
  PermissionRequest,
  ModuleId,
} from '@acc-reliability/services';
import type { IPermissionsClient } from '../clients/permissions-client';

/**
 * No-op permissions client used during the pre-auth bootstrap phase.
 *
 * @remarks
 * Registered under the `permissions` slot in {@link PlatformSdk} until the
 * authorization milestone is wired.  Defaults to deny-all for role and
 * permission checks; canAccessModule is permissive to allow internal wiring.
 */
export class NullPermissionsClient implements IPermissionsClient {
  hasRole(_role: AppRole): boolean {
    return false;
  }

  hasPermission(_request: PermissionRequest): boolean {
    return false;
  }

  canAccessModule(_moduleId: ModuleId): boolean {
    // Permissive during bootstrap — real checks enforced once auth is wired.
    return true;
  }

  getGrantedPermissions(): readonly PermissionEntry[] {
    return [];
  }

  getRoles(): readonly AppRole[] {
    return [];
  }

  isFeatureEnabled(_featureKey: string): boolean {
    return false;
  }
}
