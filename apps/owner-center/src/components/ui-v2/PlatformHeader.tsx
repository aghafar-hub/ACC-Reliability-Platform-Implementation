// apps/owner-center/src/components/ui-v2/PlatformHeader.tsx
// Platform header — pure presentational shell (Sprint 01A).
//
// Zero business logic: no context, no hooks, no data fetching. Brand is
// rendered from plain data props; every interactive control (search,
// notifications, language/theme toggles, guide-me, profile, master-data
// indicator) is accepted as a pre-rendered slot, supplied by the caller
// (eventually AppLayout, in a later sprint) — this component never imports
// or knows what implementation lives behind a slot.
//
// Desktop/laptop layout only this sprint: a single flex row. Mobile has no
// bespoke interaction (no overflow menu, no JS) — narrow viewports fall back
// to a plain CSS wrap, per the approved Sprint 01A scope. Responsive
// interaction behavior is Sprint 01C.

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
  /** The existing language toggle, unchanged — visual redesign is future scope. */
  readonly languageToggleSlot: React.ReactNode;
  /** The existing theme toggle, unchanged — visual redesign is future scope. */
  readonly themeToggleSlot: React.ReactNode;
  /** The existing "Guide Me" tour trigger, unchanged — visual redesign is future scope. */
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
            <span className="accv2-platform-header__brand-name">
              {accName ?? 'ACC Reliability Platform'}
            </span>
            {appName !== undefined && (
              <span className="accv2-platform-header__brand-subtitle">{appName}</span>
            )}
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
