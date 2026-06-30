// apps/owner-center/src/components/ProtectedRoute.tsx
// Authentication-only route guard.
//
// Architecture rules (PS-101, Sprint 01B):
//  - Reads auth state exclusively from AuthContext (useAuth).
//  - No permission checks — that belongs to Sprint 02+.
//  - No business logic.
//  - Loading state shows AuthLoadingScreen to prevent a login-page flash.

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLoadingScreen } from '../pages/AuthLoadingScreen';

/**
 * Route wrapper that enforces authentication.
 *
 * Behaviour:
 *  - `loading`        → displays AuthLoadingScreen (session still restoring)
 *  - `authenticated`  → renders nested routes via <Outlet />
 *  - any other status → redirects to /login
 *
 * Usage in router:
 * ```tsx
 * <Route element={<ProtectedRoute />}>
 *   <Route path="/" element={<AppLayout />}>
 *     ...
 *   </Route>
 * </Route>
 * ```
 *
 * No permission checks are performed here. Permission-based guards will be
 * added in a future sprint and composed on top of this component.
 */
export function ProtectedRoute(): React.ReactElement {
  const { status } = useAuth();

  if (status === 'loading') return <AuthLoadingScreen />;
  if (status === 'authenticated') return <Outlet />;

  // 'unauthenticated' or 'idle' → send to login
  return <Navigate to="/login" replace />;
}
