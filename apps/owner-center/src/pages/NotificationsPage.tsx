// apps/owner-center/src/pages/NotificationsPage.tsx
// Placeholder page for the Notifications center.
// No business data, no API calls. Feed loads lazily in a future patch.

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const COPY = {
  title:    { en: 'Notifications',                      ar: 'الإشعارات'                   },
  subtitle: { en: 'Platform notifications and alerts.', ar: 'إشعارات المنصة والتنبيهات.'   },
  status:   { en: 'Coming soon',                        ar: 'قريباً'                        },
} as const;

export default function NotificationsPage(): React.ReactElement {
  const { locale } = useLanguage();
  const isAr = locale === 'ar';

  return (
    <div className="placeholder-page">
      <div className="placeholder-page__icon" aria-hidden="true">N</div>
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
