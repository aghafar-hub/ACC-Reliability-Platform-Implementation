// apps/owner-center/src/routes/AppRouter.tsx
// Application router for the Owner Center shell.
//
// Route tree:
//   /login         → LoginPage (public)
//   /unauthorized  → UnauthorizedPage (public)
//   /              → ProtectedRoute → AppLayout → WelcomeDashboard (index)
//   /<module>      → ProtectedRoute → AppLayout → DynamicModuleRoute (from manifest)
//   *              → redirect to /
//
// Dynamic Module Platform (Sprint 03):
//   Routes are built from enabled module manifests in ModuleRegistryContext.
//   No module routes are hardcoded.  Adding a new module requires only a
//   UIModuleManifest entry in platform-manifests.ts.
//
// Authorization guard layers (innermost wins):
//   1. ProtectedRoute   — authentication check
//   2. PermissionRoute  — module access check via PermissionService
//
// Admin-only routes use adminOnly=true on PermissionRoute which checks
// contractorScope:'all'; only AppOwner users satisfy that scope.
// Always-visible routes (no moduleId) bypass PermissionRoute entirely.

import React, { Suspense, useMemo, type ReactElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ModuleId } from '@acc-reliability/sdk';
import { AppLayout }          from '../layouts/AppLayout';
import { LoadingScreen }      from '../pages/LoadingScreen';
import { WelcomeDashboard }   from '../pages/WelcomeDashboard';
import { LoginPage }          from '../pages/LoginPage';
import { UnauthorizedPage }   from '../pages/UnauthorizedPage';
import { ProtectedRoute }     from '../components/ProtectedRoute';
import { PermissionRoute }    from '../components/PermissionRoute';
import { useModuleRegistry }  from '../context/ModuleRegistryContext';
import type { UIModuleManifest } from '../types/module-registry-types';

// ── Dynamic module route renderer ─────────────────────────────────────────────

/**
 * Returns a <Route> element (or null) for a UIModuleManifest.
 *
 * Called as a plain function — NOT as <DynamicModuleRoute /> — so React Router
 * sees the returned <Route> node directly and passes its child-type validation.
 *
 * Rules:
 *  - The Home route (`/`) is rendered as the index route in AppRouter directly;
 *    manifests with routePath='/' are skipped here.
 *  - Always-visible routes (alwaysVisible=true, no moduleId) are rendered
 *    without a PermissionRoute wrapper.
 *  - Routes with a moduleId are wrapped in PermissionRoute for access control.
 *    adminOnly=true requires contractorScope:'all' (AppOwner only).
 *  - Business modules that declare moduleNavItems also receive a wildcard
 *    sub-route (`<base>/*`) so links to module sub-pages (e.g. /oil-lubrication/oil-change)
 *    render the module's placeholder page rather than falling through to the
 *    global catch-all redirect.
 */
function buildModuleRoute(manifest: UIModuleManifest): ReactElement | null {
  if (!manifest.component || !manifest.routePath || manifest.routePath === '/') {
    return null;
  }

  // Strip leading slash — React Router path prop is relative inside <Route path="/">
  const relativePath = manifest.routePath.replace(/^\//, '');
  const Page = manifest.component;
  const hasSubNav = (manifest.moduleNavItems?.length ?? 0) > 0;

  // Always-visible platform entries (Notifications, Learning, Settings) need
  // no permission check.
  if (manifest.alwaysVisible || !manifest.moduleId) {
    return <Route key={manifest.routePath} path={relativePath} element={<Page />} />;
  }

  return (
    <Route
      key={manifest.moduleId}
      element={
        <PermissionRoute
          moduleId={manifest.moduleId as ModuleId}
          adminOnly={manifest.adminOnly}
        />
      }
    >
      <Route path={relativePath} element={<Page />} />
      {hasSubNav && (
        <Route path={`${relativePath}/*`} element={<Page />} />
      )}
    </Route>
  );
}

// ── AppRouter ─────────────────────────────────────────────────────────────────

/**
 * Application router — builds its module route tree from registered manifests.
 *
 * The static portion of the tree (login, unauthorized, home index, catch-all)
 * is kept here.  All module-specific routes are generated dynamically from
 * {@link useModuleRegistry} — no hardcoded module imports.
 *
 * To add a new module: append a {@link UIModuleManifest} to
 * `src/registry/platform-manifests.ts`.  Do not modify this file.
 */
export function AppRouter(): ReactElement {
  const { enabledManifests } = useModuleRegistry();

  // Only manifests with a routePath and component participate in routing.
  // Home (routePath='/') is handled by the index route below.
  const moduleRoutes = useMemo(
    () => enabledManifests.filter(
      m => Boolean(m.routePath) && m.routePath !== '/' && Boolean(m.component),
    ),
    [enabledManifests],
  );

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>

          {/* ── Public routes ──────────────────────────────────────────────── */}
          <Route path="/login"        element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* ── Protected routes — authentication required ─────────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppLayout />}>

              {/* Home dashboard — always visible, no module permission */}
              <Route index element={<WelcomeDashboard />} />

              {/* Dynamic module routes from manifests */}
              {moduleRoutes.map(m => buildModuleRoute(m))}

              {/*
               * Inner catch-all: any path that reaches AppLayout but has no
               * matching module route (disabled module URL, unknown path, etc.)
               * is redirected to the dashboard.  Without this, disabled module
               * URLs render AppLayout with an empty <Outlet /> because the
               * parent <Route path="/"> always matches paths starting with "/".
               */}
              <Route path="*" element={<Navigate to="/" replace />} />

            </Route>
          </Route>

          {/* ── Outer catch-all: paths that fall outside the "/" tree ─────── */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
