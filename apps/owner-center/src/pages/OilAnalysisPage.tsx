// apps/owner-center/src/pages/OilAnalysisPage.tsx
// Placeholder page for the Oil Analysis module.
// Renders when the oil-analysis module is enabled and the user navigates to /oil-analysis.

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const COPY = {
  title:    { en: 'Oil Analysis',                              ar: 'تحليل الزيت'                          },
  subtitle: { en: 'Laboratory oil analysis results and anomaly monitoring.', ar: 'نتائج تحليل الزيت المختبري ومراقبة الشذوذ.' },
  status:   { en: 'Module loading…',                          ar: 'جارٍ تحميل الوحدة…'                  },
} as const;

export default function OilAnalysisPage(): React.ReactElement {
  const { locale } = useLanguage();
  const isAr = locale === 'ar';

  return (
    <div className="placeholder-page">
      <div className="placeholder-page__icon" aria-hidden="true">OA</div>
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
