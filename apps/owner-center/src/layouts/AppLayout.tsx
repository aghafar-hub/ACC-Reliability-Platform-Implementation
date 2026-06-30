// apps/owner-center/src/layouts/AppLayout.tsx
// Platform shell layout frame.
//
// Renders the persistent chrome (header, sidebar, content area) that surrounds
// all module pages.  Business module pages are rendered into the <Outlet />.
// No business logic, no API calls, no data fetching.

import React, { useEffect, useMemo } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useBranding } from '../context/BrandingContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useTour } from '../context/TourContext';
import { useAuth } from '../context/AuthContext';
import { useModuleRegistry } from '../context/ModuleRegistryContext';
import { useCommandPalette } from '../hooks/useCommandPalette';
import { usePermissions } from '../hooks/usePermissions';
import { Breadcrumb } from '../components/Breadcrumb';
import { NavIcon } from '../components/NavIcon';
import { UserMenu } from '../components/UserMenu';
import { SearchButton } from '../components/SearchButton';
import { CommandPalette } from '../components/CommandPalette';
import type { LocaleCode, ThemeId } from '../types/app-types';
import type { GuideTourId } from '../types/tour-types';
import type { ModuleId } from '@acc-reliability/sdk';

// ── Sub-components ────────────────────────────────────────────────────────────

/** ACC + optional contractor logo block — top-left of the header. */
function BrandBlock(): React.ReactElement {
  const { branding } = useBranding();
  const { acc, contractor } = branding;

  return (
    <div className="brand-block" aria-label="Branding">
      <div className="brand-acc">
        {acc.logoSrc !== undefined ? (
          <img className="brand-acc__logo" src={acc.logoSrc} alt="ACC logo" />
        ) : (
          <>
            <span className="brand-acc__name">ACC Reliability Platform</span>
            {acc.appName !== undefined && (
              <span className="brand-subtitle">{acc.appName}</span>
            )}
          </>
        )}
      </div>

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

/** Toggle between EN and AR locales. */
function LanguageToggle({
  locale,
  setLocale,
}: {
  locale: LocaleCode;
  setLocale: (l: LocaleCode) => void;
}): React.ReactElement {
  const isAr = locale === 'ar';
  const next: LocaleCode = isAr ? 'en' : 'ar';

  return (
    <button
      type="button"
      className="lang-toggle"
      onClick={() => { setLocale(next); }}
      aria-label={isAr ? 'Switch to English' : 'Switch to Arabic'}
    >
      {isAr ? 'EN' : 'AR'}
    </button>
  );
}

/** Toggle between light and dark themes. */
function ThemeToggle({
  theme,
  setTheme,
}: {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}): React.ReactElement {
  const isDark = theme === 'dark';
  const next: ThemeId = isDark ? 'light' : 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => { setTheme(next); }}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <span className="theme-toggle__icon" aria-hidden="true">{isDark ? '☀' : '◑'}</span>
      <span className="theme-toggle__label">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}

/** "Guide Me" button — placeholder until tour overlay milestone. */
function GuideMeButton(): React.ReactElement {
  const { tourState, startTour } = useTour();

  function handleClick(): void {
    if (!tourState.isActive) {
      startTour('shell:welcome' as GuideTourId);
    }
  }

  return (
    <button
      type="button"
      className="guide-me-btn"
      onClick={handleClick}
      disabled={tourState.isActive}
      aria-label="Start guided tour"
    >
      <span className="guide-me-btn__icon" aria-hidden="true">ⓘ</span>
      <span className="guide-me-btn__label">{tourState.isActive ? 'Tour active' : 'Guide Me'}</span>
    </button>
  );
}

/**
 * Header notification bell — placeholder unread count only.
 * The notification list is NOT loaded here; it loads lazily inside NotificationsPage.
 */
function NotificationBell({ locale }: { locale: LocaleCode }): React.ReactElement {
  const isAr = locale === 'ar';
  const UNREAD_PLACEHOLDER = 3;

  return (
    <Link
      to="/notifications"
      className="notif-bell"
      aria-label={
        isAr
          ? `الإشعارات: ${UNREAD_PLACEHOLDER} غير مقروءة`
          : `Notifications: ${UNREAD_PLACEHOLDER} unread`
      }
    >
      <span className="notif-bell__icon" aria-hidden="true">&#128276;</span>
      <span className="notif-bell__badge" aria-hidden="true">{UNREAD_PLACEHOLDER}</span>
    </Link>
  );
}

/**
 * Sidebar with module navigation links.
 *
 * Navigation items are generated dynamically from the registered module
 * manifests via {@link useModuleRegistry}.  No module definitions live here.
 *
 * Visibility rules (applied in order):
 *  1. alwaysVisible items (Home, Notifications, Learning, Settings) — always shown.
 *  2. Items without a moduleId — always shown.
 *  3. Not authenticated — hide all permission-guarded items.
 *  4. adminOnly items — shown only when canAccessAdminModule passes.
 *  5. All other module items — shown when canAccessModule passes.
 */
function AppSidebar({ locale }: { locale: LocaleCode }): React.ReactElement {
  const isAr          = locale === 'ar';
  const { status }    = useAuth();
  const permissions   = usePermissions();
  const { navItems }  = useModuleRegistry();

  const visibleItems = useMemo(() =>
    navItems.filter((item) => {
      if (item.alwaysVisible || item.moduleId === undefined) return true;
      if (status !== 'authenticated') return false;
      return item.adminOnly === true
        ? permissions.canAccessAdminModule(item.moduleId as ModuleId)
        : permissions.canAccessModule(item.moduleId as ModuleId);
    }),
    [navItems, permissions, status],
  );

  return (
    <nav className="app-sidebar" aria-label="Module navigation">
      {visibleItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.end}
          className={({ isActive }: { isActive: boolean }) =>
            `nav-item${isActive ? ' nav-item--active' : ''}${item.inMaintenance ? ' nav-item--maintenance' : ''}`
          }
          aria-label={isAr ? item.label.ar : item.label.en}
        >
          <span className="nav-icon"><NavIcon id={item.icon} /></span>
          <span className="nav-label">{isAr ? item.label.ar : item.label.en}</span>
          {item.badge === 'notification' && (
            <span
              className="nav-badge"
              aria-label={isAr ? 'إشعارات جديدة' : 'New notifications'}
            />
          )}
        </NavLink>
      ))}
    </nav>
  );
}

// ── AppLayout ─────────────────────────────────────────────────────────────────

/**
 * Top-level shell layout.
 *
 * Applies `data-theme` and `dir`/`lang` on the root element and syncs them to
 * `document.documentElement` so the full page responds to theme and locale.
 *
 * Structure:
 *   - app-header : BrandBlock | spacer | SearchButton NotificationBell LanguageToggle ThemeToggle GuideMeButton UserMenu
 *   - app-body   : AppSidebar | app-content (Breadcrumb + <Outlet />)
 *   - CommandPalette (position:fixed overlay, rendered last)
 */
export function AppLayout(): React.ReactElement {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useLanguage();
  const palette = useCommandPalette();

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [dir, locale]);

  return (
    <div className="app-shell" data-theme={theme} dir={dir} lang={locale}>
      <header className="app-header" aria-label="Platform header">
        <BrandBlock />
        <div className="app-header__spacer" />
        <div className="app-header__actions">
          <SearchButton locale={locale} onOpen={palette.open} />
          <NotificationBell locale={locale} />
          <div className="app-header__sep" aria-hidden="true" />
          <LanguageToggle locale={locale} setLocale={setLocale} />
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <GuideMeButton />
          <div className="app-header__sep" aria-hidden="true" />
          <UserMenu locale={locale} />
        </div>
      </header>

      <div className="app-body">
        <AppSidebar locale={locale} />
        <main className="app-content">
          <Breadcrumb locale={locale} />
          <Outlet />
        </main>
      </div>

      {/* Command palette — position:fixed, overlays everything */}
      <CommandPalette
        isOpen={palette.isOpen}
        query={palette.query}
        results={palette.results}
        selectedIndex={palette.selectedIndex}
        locale={locale}
        onClose={palette.close}
        onQueryChange={palette.setQuery}
        onSelectedIndexChange={palette.setSelectedIndex}
      />
    </div>
  );
}
