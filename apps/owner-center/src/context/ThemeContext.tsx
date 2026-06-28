// apps/owner-center/src/context/ThemeContext.tsx
// Platform theme context and provider.
//
// Manages the active ThemeId ('light' | 'dark') for the shell.
// Business modules inherit the active theme; they must not override it.

import React, { createContext, useContext, useState } from 'react';
import type { ThemeContextValue, ThemeId } from '../types/app-types';

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Wraps the application with theme state. Default theme: 'light'. */
export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [theme, setTheme] = useState<ThemeId>('light');

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Returns the current theme context. Must be called inside ThemeProvider. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === null) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
