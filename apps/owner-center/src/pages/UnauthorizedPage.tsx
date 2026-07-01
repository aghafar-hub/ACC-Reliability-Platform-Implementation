// apps/owner-center/src/pages/UnauthorizedPage.tsx
// Reusable 403 Unauthorized page.
//
// No permission checks are wired here yet — this page is created as a
// reusable shell placeholder per Sprint 01B scope.  A future sprint will
// compose permission-based routing on top of ProtectedRoute and link to
// this page when access is denied.

import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const COPY = {
  code:        { en: '403',                                          ar: '٤٠٣'                               },
  title:       { en: 'Access Denied',                               ar: 'الوصول مرفوض'                      },
  desc:        { en: "You don't have permission to view this page. Contact your administrator if you believe this is an error.", ar: 'ليس لديك صلاحية لعرض هذه الصفحة. تواصل مع المسؤول إذا كنت تعتقد أن هذا خطأ.' },
  goHome:      { en: 'Go to Dashboard',                             ar: 'الذهاب إلى لوحة التحكم'             },
  pageTitle:   { en: '403 Unauthorized — ACC Reliability Platform', ar: '٤٠٣ غير مصرح به — منصة ACC للموثوقية' },
} as const;

/**
 * 403 Unauthorized page.
 *
 * Standalone — does NOT use AppLayout.
 * Available at `/unauthorized`.
 * Future sprints will navigate to this page from permission-based route guards.
 */
export function UnauthorizedPage(): React.ReactElement {
  const { theme }  = useTheme();
  const { locale } = useLanguage();
  const isAr = locale === 'ar';
  const dir  = isAr ? 'rtl' : 'ltr';

  const t = (key: keyof typeof COPY): string => isAr ? COPY[key].ar : COPY[key].en;

  return (
    <div
      className="unauth-page"
      data-theme={theme}
      dir={dir}
      lang={locale}
      role="main"
      aria-label={t('pageTitle')}
    >
      <div className="unauth-page__card">
        {/* Icon */}
        <div className="unauth-page__icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none" width="48" height="48" aria-hidden="true">
            <rect width="48" height="48" rx="12" fill="currentColor" opacity="0.10" />
            <path
              d="M24 14a6 6 0 016 6v2h2a2 2 0 012 2v10a2 2 0 01-2 2H16a2 2 0 01-2-2V24a2 2 0 012-2h2v-2a6 6 0 016-6zm0 16a2 2 0 100-4 2 2 0 000 4zm0-14a4 4 0 00-4 4v2h8v-2a4 4 0 00-4-4z"
              fill="currentColor"
            />
          </svg>
        </div>

        {/* Code */}
        <p className="unauth-page__code" aria-hidden="true">{t('code')}</p>

        {/* Title */}
        <h1 className="unauth-page__title">{t('title')}</h1>

        {/* Description */}
        <p className="unauth-page__desc">{t('desc')}</p>

        {/* Navigation */}
        <Link to="/" className="unauth-page__cta">
          {t('goHome')}
        </Link>
      </div>
    </div>
  );
}
