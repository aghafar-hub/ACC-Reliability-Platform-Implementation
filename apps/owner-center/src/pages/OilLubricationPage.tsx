// apps/owner-center/src/pages/OilLubricationPage.tsx
// Placeholder page for the Oil Lubrication module.
// No business data, no API calls. Module UI content loads lazily in a future patch.

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const COPY = {
  title:    { en: 'Oil Lubrication',                          ar: 'تشحيم الزيت'                        },
  subtitle: { en: 'Oil lubrication management and monitoring.', ar: 'إدارة ومراقبة تشحيم الزيت.'          },
  status:   { en: 'Module loading…',                          ar: 'جارٍ تحميل الوحدة…'                  },
} as const;

export default function OilLubricationPage(): React.ReactElement {
  const { locale } = useLanguage();
  const isAr = locale === 'ar';

  return (
    <div className="placeholder-page">
      <div className="placeholder-page__icon" aria-hidden="true">OL</div>
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
