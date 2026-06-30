// apps/owner-center/src/components/UserMenu.tsx
// Header user menu — reads authenticated user from AuthContext.
//
// Displays: display name, primary role, contractor.
// Opens a dropdown on click with a Sign Out action.
// Logout flows through AuthContext.logout() → AuthService.signOut() → audit → redirect.
//
// Architecture rule: this component never calls platform services directly;
// all auth operations are delegated to useAuth().

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { LocaleCode } from '../types/app-types';

// ── Props ─────────────────────────────────────────────────────────────────────

interface UserMenuProps {
  readonly locale: LocaleCode;
}

// ── Copy table ────────────────────────────────────────────────────────────────

const COPY = {
  ariaLabel:  { en: 'User menu',   ar: 'قائمة المستخدم' },
  signOut:    { en: 'Sign Out',    ar: 'تسجيل الخروج'  },
  role:       { en: 'Role',        ar: 'الدور'           },
  contractor: { en: 'Contractor',  ar: 'المقاول'          },
} as const;

// ── Role formatter ────────────────────────────────────────────────────────────

/** Converts e.g. "platform.admin" → "Platform Admin" */
function formatRole(role: string): string {
  return role
    .split('.')
    .map(seg => seg.charAt(0).toUpperCase() + seg.slice(1))
    .join(' ');
}

// ── UserMenu ──────────────────────────────────────────────────────────────────

export function UserMenu({ locale }: UserMenuProps): React.ReactElement {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef         = useRef<HTMLDivElement>(null);
  const isAr = locale === 'ar';

  const displayName  = user?.displayName  ?? '—';
  const primaryRole  = user?.roles?.[0]   ?? '';
  const contractor   = user?.contractorId ?? '';
  const initials     = displayName.charAt(0).toUpperCase();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  function handleLogout(): void {
    setOpen(false);
    void logout();
  }

  return (
    <div
      ref={menuRef}
      className={`user-menu${open ? ' user-menu--open' : ''}`}
    >
      {/* Trigger */}
      <button
        type="button"
        className="user-menu__trigger"
        onClick={() => setOpen(prev => !prev)}
        aria-label={isAr ? COPY.ariaLabel.ar : COPY.ariaLabel.en}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="user-menu__avatar" aria-hidden="true">{initials}</span>
        <span className="user-menu__name">{displayName}</span>
        <span className="user-menu__caret" aria-hidden="true">▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="user-menu__dropdown"
          role="menu"
          aria-label={isAr ? COPY.ariaLabel.ar : COPY.ariaLabel.en}
        >
          {/* User info */}
          <div className="user-menu__dd-info" role="none">
            <span className="user-menu__dd-name">{displayName}</span>
            {primaryRole.length > 0 && (
              <span className="user-menu__dd-meta">
                <span className="user-menu__dd-meta-label">
                  {isAr ? COPY.role.ar : COPY.role.en}
                </span>
                {' '}
                <span className="user-menu__dd-meta-value">{formatRole(primaryRole)}</span>
              </span>
            )}
            {contractor.length > 0 && (
              <span className="user-menu__dd-meta">
                <span className="user-menu__dd-meta-label">
                  {isAr ? COPY.contractor.ar : COPY.contractor.en}
                </span>
                {' '}
                <span className="user-menu__dd-meta-value">{contractor}</span>
              </span>
            )}
          </div>

          <div className="user-menu__dd-sep" role="separator" />

          {/* Sign out */}
          <button
            type="button"
            className="user-menu__dd-signout"
            role="menuitem"
            onClick={handleLogout}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm10.293 4.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L14.586 11H7a1 1 0 110-2h7.586l-1.293-1.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            <span>{isAr ? COPY.signOut.ar : COPY.signOut.en}</span>
          </button>
        </div>
      )}
    </div>
  );
}
