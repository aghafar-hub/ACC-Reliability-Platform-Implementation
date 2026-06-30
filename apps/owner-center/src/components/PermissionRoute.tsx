// apps/owner-center/src/components/PermissionRoute.tsx
// Authorization route guard — permission enforcement layer.
//
// Architecture rules (Sprint 02):
//  - Composed ON TOP of ProtectedRoute; auth is already verified upstream.
//  - Reads permissions exclusively via sdk.permissions — no role comparisons.
//  - adminOnly=true   → checks contractorScope:'all'; only AppOwner passes.
//  - adminOnly=false  → checks canAccessModule (user's own contractor scope).
//  - Unauthorized → Navigate to /unauthorized (never exposes denial reason).
//  - Belt-and-suspenders auth guard in case component is used outside ProtectedRoute.

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import type { ModuleId } from '@acc-reliability/sdk';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

// ── Props ─────────────────────────────────────────────────────────────────────

interface PermissionRouteProps {
  /**
   * Platform module identifier to check access for.
   * Must be a value from KNOWN_MODULES (or a registered custom module id).
   */
  readonly moduleId: ModuleId;

  /**
   * When true, the route requires `contractorScope:'all'` read access.
   * Only `AppOwner` users satisfy this check.  Use for Owner Center
   * administration pages (Users & Roles, Contractors, System Health, …).
   *
   * When false/omitted, a standard `canAccessModule` check is performed
   * against the user's own contractor scope.
   */
  readonly adminOnly?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Permission-enforcement route wrapper.
 *
 * Nest inside `<ProtectedRoute>` in the router tree.  Both components are
 * intentionally separate:
 *  - `ProtectedRoute` — answers "is the user authenticated?"
 *  - `PermissionRoute` — answers "is the user authorised for this module?"
 *
 * Usage:
 * ```tsx
 * <Route element={<ProtectedRoute />}>
 *   <Route path="/" element={<AppLayout />}>
 *     <Route element={<PermissionRoute moduleId="users-roles" adminOnly />}>
 *       <Route path="users-roles" element={<UsersRolesPage />} />
 *     </Route>
 *   </Route>
 * </Route>
 * ```
 */
export function PermissionRoute({
  moduleId,
  adminOnly = false,
}: PermissionRouteProps): React.ReactElement {
  const { status } = useAuth();
  const permissions = usePermissions();

  // Belt-and-suspenders: ProtectedRoute already handles this, but guard here
  // in case PermissionRoute is ever used outside a ProtectedRoute subtree.
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }

  const allowed = adminOnly
    ? permissions.canAccessAdminModule(moduleId)
    : permissions.canAccessModule(moduleId);

  if (!allowed) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
