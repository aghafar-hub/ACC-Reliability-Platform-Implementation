// apps/owner-center/src/pages/LearningCenterPage.tsx
// Placeholder page for the Learning Center.
// No business data, no API calls. Catalog loads lazily in a future patch.

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const COPY = {
  title:    { en: 'Learning Center',                                             ar: 'مركز التعلم'                                          },
  subtitle: { en: 'Role-aware guides, tours, and module documentation.',         ar: 'أدلة وجولات وتوثيق الوحدات الخاصة بكل دور.'           },
  status:   { en: 'Coming soon',                                                 ar: 'قريباً'                                               },
} as const;

export default function LearningCenterPage(): React.ReactElement {
  const { locale } = useLanguage();
  const isAr = locale === 'ar';

  return (
    <div className="placeholder-page">
      <div className="placeholder-page__icon" aria-hidden="true">LC</div>
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
