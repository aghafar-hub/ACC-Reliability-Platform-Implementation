// apps/owner-center/src/App.tsx
// Root application component — composes all shell providers and the router.
//
// Provider order (outer → inner):
//   ErrorBoundary          — catches any render error in the tree below
//   SdkProvider            — bootstraps Platform SDK; renders loading/error until ready
//   ThemeProvider          — manages active ThemeId
//   LanguageProvider       — manages active LocaleCode
//   BrandingProvider       — manages ACC + contractor branding config
//   TourProvider           — manages guided-tour runtime state
//   AuthProvider           — manages authentication state
//   ModuleRegistryProvider — Dynamic Module Platform (Sprint 03)
//   AppRouter              — React Router BrowserRouter + manifest-driven route tree

import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SdkProvider } from './context/SdkContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { BrandingProvider } from './context/BrandingContext';
import { TourProvider } from './context/TourContext';
import { AuthProvider } from './context/AuthContext';
import { ModuleRegistryProvider } from './context/ModuleRegistryContext';
import { PLATFORM_MODULE_MANIFESTS } from './registry/platform-manifests';
import { AppRouter } from './routes/AppRouter';

export default function App(): React.ReactElement {
  return (
    <ErrorBoundary>
      <SdkProvider>
        <ThemeProvider>
          <LanguageProvider>
            <BrandingProvider>
              <TourProvider>
                <AuthProvider>
                  <ModuleRegistryProvider manifests={PLATFORM_MODULE_MANIFESTS}>
                    <AppRouter />
                  </ModuleRegistryProvider>
                </AuthProvider>
              </TourProvider>
            </BrandingProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SdkProvider>
    </ErrorBoundary>
  );
}
