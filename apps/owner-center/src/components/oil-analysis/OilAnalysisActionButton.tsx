// apps/owner-center/src/components/oil-analysis/OilAnalysisActionButton.tsx
// RBAC-aware button — hidden when unauthorized, disabled with tooltip when fallback is shown.

import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { OIL_ANALYSIS_PERMISSION_DENIED } from '../../hooks/useOilAnalysisPermissions';

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

export interface OilAnalysisActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly allowed: boolean;
  readonly hideWhenDenied?: boolean;
  readonly deniedTooltip?: L10n<string>;
}

export function OilAnalysisActionButton({
  allowed,
  hideWhenDenied = false,
  deniedTooltip = OIL_ANALYSIS_PERMISSION_DENIED,
  disabled,
  title,
  children,
  ...rest
}: OilAnalysisActionButtonProps): React.ReactElement | null {
  const { locale } = useLanguage();

  if (!allowed && hideWhenDenied) return null;

  const deniedTitle = t(deniedTooltip, locale);
  const isDisabled = disabled || !allowed;

  return (
    <button
      {...rest}
      disabled={isDisabled}
      title={!allowed ? deniedTitle : title}
      aria-disabled={isDisabled}
    >
      {children}
    </button>
  );
}
