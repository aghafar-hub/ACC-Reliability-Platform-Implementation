// apps/owner-center/src/layouts/AppLayout.tsx
// Platform shell layout frame.
//
// Renders the persistent chrome (header, sidebar, content area) that surrounds
// all module pages.  Business module pages are rendered into the <Outlet />.
// No business logic, no API calls, no data fetching.

import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * Top-level shell layout.
 *
 * Structure (per 009 §4 — Platform Shell):
 *   - app-header   : navigation bar, branding, user menu placeholder
 *   - app-sidebar  : module navigation placeholder
 *   - app-content  : active module page rendered via React Router <Outlet />
 */
export function AppLayout(): React.ReactElement {
  return (
    <div className="app-shell">
      <header className="app-header" aria-label="Platform header" />
      <div className="app-body">
        <nav className="app-sidebar" aria-label="Module navigation" />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
