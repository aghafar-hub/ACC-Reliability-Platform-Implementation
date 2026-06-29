// apps/owner-center/src/pages/SettingsPage.tsx
// Placeholder page for platform Settings.
// No business data, no API calls. Controls load lazily in a future patch.

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const COPY = {
  title:    { en: 'Settings',                                   ar: 'الإعدادات'                       },
  subtitle: { en: 'Platform preferences and configuration.',    ar: 'تفضيلات المنصة والإعدادات.'        },
  status:   { en: 'Coming soon',                                ar: 'قريباً'                            },
} as const;

export default function SettingsPage(): React.ReactElement {
  const { locale } = useLanguage();
  const isAr = locale === 'ar';

  return (
    <div className="placeholder-page">
      <div className="placeholder-page__icon" aria-hidden="true">S</div>
      <h1 className="placeholder-page__title">
        {isAr ? COPY.title.ar : COPY.title.en}
      </h1>
      <p className="placeholder-page__subtitle">
        {isAr ? COPY.subtitle.ar : COPY.subtitle.en}
      </p>
      <span className="placeholder-page__status">
        {isAr ? COPY.status.ar : COPY.status.en}
      </span>
    </div>
  );
}
