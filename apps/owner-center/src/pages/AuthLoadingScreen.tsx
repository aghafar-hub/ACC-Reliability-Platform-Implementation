// apps/owner-center/src/pages/AuthLoadingScreen.tsx
// Professional loading screen displayed while the auth session is being restored.
//
// Shown by ProtectedRoute and LoginPage during the initial session-restore tick.
// Must not flash: it resolves within one render cycle once the SDK is ready.
// Uses the same branding tokens as the LoginPage for visual continuity.

import React, { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const COPY = {
  authenticating: { en: 'Authenticating…',  ar: 'جارٍ المصادقة…' },
  platform:       { en: 'ACC Reliability Platform', ar: 'منصة ACC للموثوقية' },
} as const;

/** Fullscreen branded loading screen shown during authentication session restore. */
export function AuthLoadingScreen(): React.ReactElement {
  const { theme } = useTheme();
  const { locale } = useLanguage();
  const isAr = locale === 'ar';
  const dir  = isAr ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir  = dir;
    document.documentElement.lang = locale;
  }, [dir, locale]);

  return (
    <div
      className="auth-loading"
      data-theme={theme}
      dir={dir}
      lang={locale}
      role="status"
      aria-label={isAr ? COPY.authenticating.ar : COPY.authenticating.en}
      aria-live="polite"
    >
      <div className="auth-loading__brand" aria-hidden="true">
        <div className="auth-loading__mark">
          <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" className="auth-loading__mark-icon">
            <rect width="40" height="40" rx="10" fill="currentColor" opacity="0.15" />
            <text
              x="20" y="27"
              textAnchor="middle"
              fontSize="20"
              fontWeight="bold"
              fill="currentColor"
            >
              A
            </text>
          </svg>
        </div>
        <span className="auth-loading__platform-name">
          {isAr ? COPY.platform.ar : COPY.platform.en}
        </span>
      </div>

      <div className="auth-loading__spinner" aria-hidden="true" />

      <span className="auth-loading__text">
        {isAr ? COPY.authenticating.ar : COPY.authenticating.en}
      </span>
    </div>
  );
}
