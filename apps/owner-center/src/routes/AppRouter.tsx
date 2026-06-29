// apps/owner-center/src/routes/AppRouter.tsx
// Application router for the Owner Center shell.
//
// All module pages are loaded via React.lazy() so their JS chunks are only
// fetched when the user navigates to that route — never on startup.
// The <Suspense> boundary at the root catches every lazy load and shows
// LoadingScreen while the chunk is in flight.
//
// Per 009 §5: routes will become permission-aware and dynamically registered
// through the Module Registry in a future milestone.

import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { LoadingScreen } from '../pages/LoadingScreen';
import { WelcomeDashboard } from '../pages/WelcomeDashboard';

// ── Lazy module pages — chunks fetched only on navigation ─────────────────────
const OilLubricationPage = React.lazy(() => import('../pages/OilLubricationPage'));
const NotificationsPage  = React.lazy(() => import('../pages/NotificationsPage'));
const LearningCenterPage = React.lazy(() => import('../pages/LearningCenterPage'));
const SettingsPage       = React.lazy(() => import('../pages/SettingsPage'));

export function AppRouter(): React.ReactElement {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<WelcomeDashboard />} />

            {/* Shell placeholder pages — module UI added in future patches */}
            <Route path="oil-lubrication" element={<OilLubricationPage />} />
            <Route path="notifications"   element={<NotificationsPage />} />
            <Route path="learning"        element={<LearningCenterPage />} />
            <Route path="settings"        element={<SettingsPage />} />
          </Route>

          {/* Catch-all: send unknown paths to the shell root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
