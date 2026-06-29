// apps/owner-center/src/layouts/AppLayout.tsx
// Platform shell layout frame.
//
// Renders the persistent chrome (header, sidebar, content area) that surrounds
// all module pages.  Business module pages are rendered into the <Outlet />.
// No business logic, no API calls, no data fetching.

import React, { useEffect } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useBranding } from '../context/BrandingContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useTour } from '../context/TourContext';
import { NAV_ITEMS } from '../types/navigation-types';
import { useCommandPalette } from '../hooks/useCommandPalette';
import { Breadcrumb } from '../components/Breadcrumb';
import { UserMenu } from '../components/UserMenu';
import { SearchButton } from '../components/SearchButton';
import { CommandPalette } from '../components/CommandPalette';
import type { LocaleCode, ThemeId } from '../types/app-types';
import type { GuideTourId } from '../types/tour-types';

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
          <span className="brand-acc__name">{acc.appName ?? 'Owner Center'}</span>
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
      {isDark ? 'Light' : 'Dark'}
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
      {tourState.isActive ? 'Tour active' : 'Guide Me'}
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
      <span className="notif-bell__icon" aria-hidden="true">&#9825;</span>
      <span className="notif-bell__badge" aria-hidden="true">{UNREAD_PLACEHOLDER}</span>
    </Link>
  );
}

/** Sidebar with module navigation links. Badge dot rendered for notification items. */
function AppSidebar({ locale }: { locale: LocaleCode }): React.ReactElement {
  const isAr = locale === 'ar';

  return (
    <nav className="app-sidebar" aria-label="Module navigation">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.end}
          className={({ isActive }: { isActive: boolean }) =>
            `nav-item${isActive ? ' nav-item--active' : ''}`
          }
          aria-label={isAr ? item.label.ar : item.label.en}
        >
          <span className="nav-icon" aria-hidden="true">{item.icon}</span>
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
          <LanguageToggle locale={locale} setLocale={setLocale} />
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <GuideMeButton />
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
