// apps/owner-center/src/components/ui-v2/PlatformHeader.tsx
// Platform header -- pure presentational shell (Sprint 01A; visual polish
// pass in Sprint 01B-FIX).
//
// Zero business logic: no context, no hooks, no data fetching. Brand is
// rendered from plain data props; every interactive control (search,
// notifications, language/theme toggles, guide-me, profile, master-data
// indicator) is accepted as a pre-rendered slot, supplied by the caller
// (AppLayout) -- this component never imports or knows what implementation
// lives behind a slot.
//
// Desktop/laptop layout only this sprint: a single flex row. Mobile has no
// bespoke interaction (no overflow menu, no JS) -- narrow viewports fall
// back to a plain CSS wrap. Responsive interaction behavior is Sprint 01C.
//
// Sprint 01B-FIX: when no accLogoSrc is supplied (true today -- no default
// branding logo is configured anywhere in the app), a small decorative
// accent mark renders beside the text brand lockup so the "logo area"
// reads as an intentional brand mark rather than bare text. This is a
// hand-drawn placeholder shape, not the official raster logo asset --
// wiring that in is a separate, later decision (see plan notes).

import React from 'react';
import { cn } from './types';

export interface PlatformHeaderProps {
  /** ACC logo image URL. When absent, `accName`/`appName` render as text instead. */
  readonly accLogoSrc?: string;
  readonly accName?: string;
  readonly appName?: string;
  /** Contractor branding, shown alongside the ACC mark when present. */
  readonly contractorLogoSrc?: string;
  readonly contractorName?: string;

  /** Dev-only master data provider indicator (rendered by the caller). */
  readonly masterDataIndicatorSlot?: React.ReactNode;
  /** The existing search trigger (e.g. today's `SearchButton`), unchanged. */
  readonly searchSlot: React.ReactNode;
  /** The existing notification bell (e.g. today's `NotificationBell`), unchanged. */
  readonly notificationsSlot: React.ReactNode;
  /** The existing language toggle, unchanged -- visual redesign is future scope. */
  readonly languageToggleSlot: React.ReactNode;
  /** The existing theme toggle, unchanged -- visual redesign is future scope. */
  readonly themeToggleSlot: React.ReactNode;
  /** The existing "Guide Me" tour trigger, unchanged -- visual redesign is future scope. */
  readonly guideMeSlot: React.ReactNode;
  /** The existing profile/user menu (e.g. today's `UserMenu`), unchanged. */
  readonly profileSlot: React.ReactNode;

  readonly className?: string;
}

export function PlatformHeader({
  accLogoSrc,
  accName,
  appName,
  contractorLogoSrc,
  contractorName,
  masterDataIndicatorSlot,
  searchSlot,
  notificationsSlot,
  languageToggleSlot,
  themeToggleSlot,
  guideMeSlot,
  profileSlot,
  className,
}: PlatformHeaderProps): React.ReactElement {
  const hasContractor = contractorLogoSrc !== undefined || contractorName !== undefined;

  return (
    <header className={cn('accv2-platform-header', className)} aria-label="Platform header">
      <div className="accv2-platform-header__brand">
        {accLogoSrc !== undefined ? (
          <img className="accv2-platform-header__brand-logo" src={accLogoSrc} alt={accName ?? 'ACC logo'} />
        ) : (
          <>
            <svg
              className="accv2-platform-header__brand-mark"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M12 3c-1.6 3.2-3.6 4.8-3.6 8a3.6 3.6 0 007.2 0c0-3.2-2-4.8-3.6-8z" />
              <path d="M12 13.4V21" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            </svg>
            <span className="accv2-platform-header__brand-text">
              <span className="accv2-platform-header__brand-name">
                {accName ?? 'ACC Reliability Platform'}
              </span>
              {appName !== undefined && (
                <span className="accv2-platform-header__brand-subtitle">{appName}</span>
              )}
            </span>
          </>
        )}

        {hasContractor && (
          <div className="accv2-platform-header__contractor" aria-label="Contractor branding">
            {contractorLogoSrc !== undefined ? (
              <img
                className="accv2-platform-header__contractor-logo"
                src={contractorLogoSrc}
                alt={contractorName !== undefined ? `${contractorName} logo` : 'Contractor logo'}
              />
            ) : (
              <span className="accv2-platform-header__contractor-name">{contractorName}</span>
            )}
          </div>
        )}
      </div>

      <div className="accv2-platform-header__spacer" />

      <div className="accv2-platform-header__actions">
        {masterDataIndicatorSlot !== undefined && (
          <div className="accv2-platform-header__slot">{masterDataIndicatorSlot}</div>
        )}

        <div className="accv2-platform-header__slot">{searchSlot}</div>
        <div className="accv2-platform-header__slot">{notificationsSlot}</div>

        <div className="accv2-platform-header__sep" aria-hidden="true" />

        <div className="accv2-platform-header__slot">{languageToggleSlot}</div>
        <div className="accv2-platform-header__slot">{themeToggleSlot}</div>
        <div className="accv2-platform-header__slot">{guideMeSlot}</div>

        <div className="accv2-platform-header__sep" aria-hidden="true" />

        <div className="accv2-platform-header__slot">{profileSlot}</div>
      </div>
    </header>
  );
}