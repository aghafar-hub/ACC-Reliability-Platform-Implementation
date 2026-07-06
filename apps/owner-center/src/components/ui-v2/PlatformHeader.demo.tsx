// apps/owner-center/src/components/ui-v2/PlatformHeader.demo.tsx
// Isolated review harness for PlatformHeader (Sprint 01A).
//
// NOT production wiring: nothing in this file is imported by main.tsx, any
// route, or AppLayout. It has zero consumers today. Its only purpose is to
// let PlatformHeader be reviewed on its own, without mounting the real app
// or any of its context providers (Auth/Sdk/Branding/Language/Theme/...).
//
// The slots below are plain placeholder markup standing in for the real
// components (SearchButton, NotificationBell, the language/theme toggles,
// Guide Me, UserMenu, MasterDataProviderIndicator) — deliberately, since
// mounting the real ones here would require the very provider tree this
// demo exists to avoid. PlatformHeader itself cannot tell the difference,
// which is the point: it only ever sees a slot's rendered output.
//
// To actually see this render in a browser during development, a developer
// can temporarily import <PlatformHeaderDemo /> into a scratch entry point
// locally (not committed) — adding a permanent preview route is out of
// scope for this sprint (it would be a routing change).

import React from 'react';
import { PlatformHeader } from './PlatformHeader';

function MockSearchSlot(): React.ReactElement {
  return <button type="button">🔍 Search (mock)</button>;
}

function MockNotificationsSlot(): React.ReactElement {
  return <button type="button">🔔 3 (mock)</button>;
}

function MockLanguageToggleSlot(): React.ReactElement {
  return <button type="button">EN (mock)</button>;
}

function MockThemeToggleSlot(): React.ReactElement {
  return <button type="button">◑ Dark (mock)</button>;
}

function MockGuideMeSlot(): React.ReactElement {
  return <button type="button">ⓘ Guide Me (mock)</button>;
}

function MockProfileSlot(): React.ReactElement {
  return <button type="button">J. Al-Harbi ▾ (mock)</button>;
}

function MockMasterDataIndicatorSlot(): React.ReactElement {
  return <span>Master Data: Local (mock)</span>;
}

/** Mock props exercising every field, including optional contractor branding. */
export const mockPlatformHeaderProps = {
  accName: 'ACC Reliability Platform',
  appName: 'Owner Center',
  contractorName: 'RHI',
  masterDataIndicatorSlot: <MockMasterDataIndicatorSlot />,
  searchSlot: <MockSearchSlot />,
  notificationsSlot: <MockNotificationsSlot />,
  languageToggleSlot: <MockLanguageToggleSlot />,
  themeToggleSlot: <MockThemeToggleSlot />,
  guideMeSlot: <MockGuideMeSlot />,
  profileSlot: <MockProfileSlot />,
} as const;

/** Renders PlatformHeader with mock props — mount this manually, locally, to preview. */
export function PlatformHeaderDemo(): React.ReactElement {
  return <PlatformHeader {...mockPlatformHeaderProps} />;
}
