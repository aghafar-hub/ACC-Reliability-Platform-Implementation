// apps/owner-center/src/pages/oil-analysis/SettingsDisabledPanel.tsx
// Read-only disabled state when a module feature is turned off in settings.

import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { StatusChip } from '../../components/StatusChip';

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

export interface SettingsDisabledPanelProps {
  readonly title: L10n<string>;
  readonly desc: L10n<string>;
  readonly message: L10n<string>;
  readonly badge?: L10n<string>;
}

export function SettingsDisabledPanel({
  title,
  desc,
  message,
  badge,
}: SettingsDisabledPanelProps): React.ReactElement {
  const { locale } = useLanguage();
  const l = (b: L10n<string>) => t(b, locale);

  return (
    <div className="ur-page">
      <header className="ur-page__header">
        <div className="ur-page__header-text">
          <h1 className="ur-page__title">{l(title)}</h1>
          <p className="ur-page__desc">{l(desc)}</p>
        </div>
        {badge && <StatusChip status="maintenance" label={l(badge)} />}
      </header>
      <div className="oa-settings-disabled" role="status">
        <p>{l(message)}</p>
      </div>
    </div>
  );
}
