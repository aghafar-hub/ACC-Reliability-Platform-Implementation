// apps/owner-center/src/context/LanguageContext.tsx
// Platform language/locale context and provider.
//
// Manages the active LocaleCode ('en' | 'ar') for the shell.
// Supports RTL/LTR switching per 009 §10 (Localization).
// No hardcoded text — UI strings are resolved via locale at render time.

import React, { createContext, useContext, useState } from 'react';
import type { LanguageContextValue, LocaleCode } from '../types/app-types';

const LanguageContext = createContext<LanguageContextValue | null>(null);

/** Wraps the application with locale state. Default locale: 'en'. */
export function LanguageProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [locale, setLocale] = useState<LocaleCode>('en');

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

/** Returns the current language context. Must be called inside LanguageProvider. */
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (ctx === null) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
