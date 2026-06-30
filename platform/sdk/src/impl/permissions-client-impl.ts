// platform/sdk/src/impl/permissions-client-impl.ts
// SDK bridge from IPermissionsClient → IPermissionService.
//
// Extracts the current user from SdkContext so business modules never
// supply a UserContext parameter explicitly — the SDK always knows who
// is calling (PS-114 §6 / Phase 1B authorization milestone).

import type {
  AppRole,
  PermissionEntry,
  PermissionRequest,
  ModuleId,
  IPermissionService,
} from '@acc-reliability/services';

import type { SdkContext } from '../sdk-context';
import type { IPermissionsClient } from '../clients/permissions-client';

/**
 * Concrete SDK permissions client.
 *
 * All permission checks are evaluated against
 * `SdkContext.currentUser` so modules never need to hold a direct
 * reference to `UserContext`.  Contractor isolation and user-status
 * enforcement are applied inside {@link IPermissionService}.
 */
export class PermissionsClientImpl implements IPermissionsClient {
  constructor(
    private readonly service: IPermissionService,
    private readonly context: SdkContext,
  ) {}

  hasRole(role: AppRole): boolean {
    return this.service.hasRole(this.context.currentUser, role);
  }

  hasPermission(request: PermissionRequest): boolean {
    return this.service.hasPermission(this.context.currentUser, request);
  }

  canAccessModule(moduleId: ModuleId): boolean {
    return this.service.canAccessModule(this.context.currentUser, moduleId);
  }

  getGrantedPermissions(): readonly PermissionEntry[] {
    return this.service.getGrantedPermissions(this.context.currentUser);
  }

  getRoles(): readonly AppRole[] {
    return this.service.getRoles(this.context.currentUser);
  }

  isFeatureEnabled(_featureKey: string): boolean {
    // TODO: Wire to a FeatureFlagService in a future platform milestone.
    //       Return false to be conservative — modules must not assume features
    //       are enabled until the flag service is implemented.
    return false;
  }
}
