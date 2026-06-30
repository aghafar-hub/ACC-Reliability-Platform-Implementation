// apps/owner-center/src/hooks/usePermissions.ts
// Memoized permission helpers for the Owner Center shell.
//
// Design constraints (Sprint 02):
//  - All checks delegate to sdk.permissions — no direct role comparisons.
//  - Returns a deny-all stub when the user is not authenticated.
//  - The returned object is stable across renders as long as auth status and
//    the SDK instance do not change, avoiding unnecessary downstream re-renders.
//  - Admin module checks use contractorScope:'all'; only AppOwner satisfies
//    that scope in PermissionService.
//  - Business module checks delegate to sdk.permissions.canAccessModule which
//    uses the current user's own contractorId as scope.

import { useMemo } from 'react';
import type { AppRole, ModuleId } from '@acc-reliability/sdk';
import { usePlatformSdk } from '../context/SdkContext';
import { useAuth } from '../context/AuthContext';

// ── Public interface ──────────────────────────────────────────────────────────

export interface PermissionsHelpers {
  /**
   * Returns true if the authenticated user holds the given AppRole.
   * Always returns false when not authenticated.
   */
  hasRole(role: AppRole): boolean;

  /**
   * Returns true if the user can access the given business module
   * within their own contractor scope.
   * Always returns false when not authenticated.
   */
  canAccessModule(moduleId: ModuleId): boolean;

  /**
   * Returns true if the user can access an Owner Center administration module
   * (i.e. satisfies a `contractorScope:'all'` read check).
   * Only AppOwner users satisfy this; all others are denied.
   * Always returns false when not authenticated.
   */
  canAccessAdminModule(moduleId: ModuleId): boolean;
}

// ── Deny-all stub ─────────────────────────────────────────────────────────────

const DENY_ALL: PermissionsHelpers = {
  hasRole:            () => false,
  canAccessModule:    () => false,
  canAccessAdminModule: () => false,
};

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns memoized permission helpers bound to the current auth session.
 *
 * The returned object identity is stable while auth status and the SDK
 * instance are unchanged.  All helpers return `false` when the status is
 * not `'authenticated'`.
 *
 * Must be called inside both `<SdkProvider>` and `<AuthProvider>`.
 *
 * @example
 * ```tsx
 * const { canAccessAdminModule } = usePermissions();
 * const visible = canAccessAdminModule('users-roles');
 * ```
 */
export function usePermissions(): PermissionsHelpers {
  const sdk    = usePlatformSdk();
  const { status } = useAuth();

  return useMemo((): PermissionsHelpers => {
    if (status !== 'authenticated') return DENY_ALL;

    const p = sdk.permissions;

    return {
      hasRole: (role) => p.hasRole(role),

      canAccessModule: (moduleId) => p.canAccessModule(moduleId),

      canAccessAdminModule: (moduleId) =>
        p.hasPermission({ moduleId, action: 'read', contractorScope: 'all' }),
    };
  }, [sdk, status]);
}
