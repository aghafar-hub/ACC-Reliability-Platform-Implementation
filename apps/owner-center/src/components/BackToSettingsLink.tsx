// apps/owner-center/src/components/BackToSettingsLink.tsx
// Back navigation from Owner Control Center pages to /settings.

import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { NavIcon } from './NavIcon';

const COPY = {
  label: {
    en: 'Back to Owner Control Center',
    ar: 'العودة إلى مركز التحكم للمالك',
  },
} as const;

/** Link to /settings for pages opened from Owner Control Center. */
export function BackToSettingsLink(): React.ReactElement {
  const { locale } = useLanguage();
  const isAr = locale === 'ar';

  return (
    <Link
      to="/settings"
      className="occ-back-link"
      aria-label={isAr ? COPY.label.ar : COPY.label.en}
    >
      <span className="occ-back-link__icon" aria-hidden="true">
        <NavIcon id="chevron-left" />
      </span>
      <span>{isAr ? COPY.label.ar : COPY.label.en}</span>
    </Link>
  );
}
