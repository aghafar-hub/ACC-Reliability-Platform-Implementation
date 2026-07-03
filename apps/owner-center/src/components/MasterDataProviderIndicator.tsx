// apps/owner-center/src/components/MasterDataProviderIndicator.tsx
// Developer indicator for the active master-data persistence backend.

import React from 'react';
import type { MasterDataProviderMode } from '../config/sdk-bootstrap-config';

interface MasterDataProviderIndicatorProps {
  readonly mode: MasterDataProviderMode;
  readonly locale: string;
  readonly variant?: 'header' | 'settings';
}

const COPY = {
  label: { en: 'Master Data Provider', ar: 'موفر بيانات التعريف' },
  local: { en: 'Local', ar: 'محلي' },
  appsScript: { en: 'Apps Script', ar: 'Apps Script' },
  devNote: {
    en: 'Developer switch via VITE_ACC_* environment variables.',
    ar: 'مفتاح المطور عبر متغيرات البيئة VITE_ACC_*.',
  },
} as const;

function t(bundle: { en: string; ar: string }, locale: string): string {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

export function MasterDataProviderIndicator({
  mode,
  locale,
  variant = 'header',
}: MasterDataProviderIndicatorProps): React.ReactElement {
  const valueLabel = mode === 'appsScript' ? COPY.appsScript : COPY.local;
  const modifier = mode === 'appsScript' ? 'apps-script' : 'local';

  if (variant === 'header') {
    return (
      <div
        className={`master-data-indicator master-data-indicator--${modifier}`}
        role="status"
        aria-label={`${t(COPY.label, locale)}: ${t(valueLabel, locale)}`}
        title={t(COPY.devNote, locale)}
      >
        <span className="master-data-indicator__label">{t(COPY.label, locale)}:</span>
        <span className="master-data-indicator__value">{t(valueLabel, locale)}</span>
      </div>
    );
  }

  return (
    <div
      className={`master-data-indicator master-data-indicator--settings master-data-indicator--${modifier}`}
      role="status"
      aria-label={`${t(COPY.label, locale)}: ${t(valueLabel, locale)}`}
    >
      <div className="master-data-indicator__settings-title">{t(COPY.label, locale)}</div>
      <div className="master-data-indicator__settings-value">{t(valueLabel, locale)}</div>
      <p className="master-data-indicator__settings-note">{t(COPY.devNote, locale)}</p>
    </div>
  );
}
