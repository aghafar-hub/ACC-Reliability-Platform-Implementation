// apps/owner-center/src/App.tsx
// Root application component — composes all shell providers and the router.
//
// Provider order (outer → inner):
//   ErrorBoundary  — catches any render error in the tree below
//   ThemeProvider  — manages active ThemeId
//   LanguageProvider — manages active LocaleCode
//   AuthProvider   — manages authentication state
//   AppRouter      — React Router BrowserRouter + route tree

import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { AppRouter } from './routes/AppRouter';

export default function App(): React.ReactElement {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
