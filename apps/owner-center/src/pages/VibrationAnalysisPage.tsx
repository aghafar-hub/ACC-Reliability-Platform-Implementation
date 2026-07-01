// apps/owner-center/src/pages/VibrationAnalysisPage.tsx
// Placeholder page for the Vibration Analysis module.
// Renders when the vibration-analysis module is enabled and visible.
// By default this module is visibility='hidden' in the registry so it will not
// appear in the sidebar until an administrator changes its visibility to 'visible'.

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const COPY = {
  title:    { en: 'Vibration Analysis',                           ar: 'تحليل الاهتزاز'                         },
  subtitle: { en: 'Vibration measurement trends and threshold monitoring.', ar: 'اتجاهات قياس الاهتزاز ومراقبة العتبات.' },
  status:   { en: 'Module loading…',                             ar: 'جارٍ تحميل الوحدة…'                   },
} as const;

export default function VibrationAnalysisPage(): React.ReactElement {
  const { locale } = useLanguage();
  const isAr = locale === 'ar';

  return (
    <div className="placeholder-page">
      <div className="placeholder-page__icon" aria-hidden="true">VA</div>
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
