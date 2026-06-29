// apps/owner-center/src/layouts/AppLayout.tsx
// Platform shell layout frame.
//
// Renders the persistent chrome (header, sidebar, content area) that surrounds
// all module pages.  Business module pages are rendered into the <Outlet />.
// No business logic, no API calls, no data fetching.

import React from 'react';
import { Outlet } from 'react-router-dom';
import { useBranding } from '../context/BrandingContext';
import { useTour } from '../context/TourContext';

/**
 * ACC logo + optional contractor logo block shown top-left in the header.
 * Both images degrade gracefully to text when no src is configured.
 */
function BrandBlock(): React.ReactElement {
  const { branding } = useBranding();
  const { acc, contractor } = branding;

  return (
    <div className="brand-block" aria-label="Branding">
      {/* ACC brand */}
      <div className="brand-acc">
        {acc.logoSrc !== undefined ? (
          <img
            className="brand-acc__logo"
            src={acc.logoSrc}
            alt="ACC logo"
            aria-label="ACC logo"
          />
        ) : (
          <span className="brand-acc__name">{acc.appName ?? 'Owner Center'}</span>
        )}
      </div>

      {/* Contractor brand — rendered only when available */}
      {contractor !== undefined && (
        <div className="brand-contractor" aria-label="Contractor branding">
          {contractor.logoSrc !== undefined ? (
            <img
              className="brand-contractor__logo"
              src={contractor.logoSrc}
              alt={`${contractor.displayName ?? 'Contractor'} logo`}
            />
          ) : contractor.displayName !== undefined ? (
            <span className="brand-contractor__name">{contractor.displayName}</span>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * "Guide Me" button in the header.
 * Placeholder — clicking logs intent only until the tour overlay milestone.
 */
function GuideMeButton(): React.ReactElement {
  const { tourState, startTour } = useTour();

  function handleClick(): void {
    if (!tourState.isActive) {
      // No tours are registered yet; this will be wired to the active page's
      // tour registry in the guided-overlay milestone.
      startTour('shell:welcome' as import('../types/tour-types').GuideTourId);
    }
  }

  return (
    <button
      type="button"
      className="guide-me-btn"
      aria-label="Start guided tour"
      onClick={handleClick}
      disabled={tourState.isActive}
    >
      {tourState.isActive ? 'Tour active' : 'Guide Me'}
    </button>
  );
}

/**
 * Top-level shell layout.
 *
 * Structure (per 009 §4 — Platform Shell):
 *   - app-header   : branding block (ACC + contractor), navigation bar, Guide Me button
 *   - app-sidebar  : module navigation placeholder
 *   - app-content  : active module page rendered via React Router <Outlet />
 */
export function AppLayout(): React.ReactElement {
  return (
    <div className="app-shell">
      <header className="app-header" aria-label="Platform header">
        <BrandBlock />
        <nav className="app-header__nav" aria-label="Primary navigation" />
        <div className="app-header__actions">
          <GuideMeButton />
        </div>
      </header>

      <div className="app-body">
        <nav className="app-sidebar" aria-label="Module navigation" />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
