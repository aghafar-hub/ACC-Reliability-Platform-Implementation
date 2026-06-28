// apps/owner-center/src/routes/AppRouter.tsx
// Application router for the Owner Center shell.
//
// All routes use React Router v6 with <Suspense> wrapping the route tree so
// lazy-loaded module pages display the LoadingScreen while their chunk loads.
//
// Per 009 §5: routes shall be permission-aware and registered dynamically
// through the Module Registry in future milestones.  For now, only the shell
// frame routes are declared; module slots are empty placeholders.

import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { LoadingScreen } from '../pages/LoadingScreen';

/** Minimal shell landing page — replaced when module routes are registered. */
function ShellHome(): React.ReactElement {
  return (
    <div className="shell-home" role="main">
      <h1>Owner Center</h1>
      <p>Platform shell is ready. Module routes will appear here.</p>
    </div>
  );
}

export function AppRouter(): React.ReactElement {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<ShellHome />} />

            {/* Business module routes are registered dynamically here */}
          </Route>

          {/* Catch-all: send unknown paths to the shell root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
