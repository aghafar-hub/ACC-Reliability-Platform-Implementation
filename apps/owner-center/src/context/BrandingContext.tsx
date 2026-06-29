// apps/owner-center/src/context/BrandingContext.tsx
// Branding context and provider for the Owner Center shell.
//
// Holds the active BrandingConfig (ACC + optional contractor).
// After authentication, the platform layer may call setBranding() to inject
// the authenticated contractor's logo and display name.

import React, { createContext, useContext, useState } from 'react';
import type { BrandingContextValue } from '../types/app-types';
import { DEFAULT_BRANDING_CONFIG } from '../types/branding-types';

const BrandingContext = createContext<BrandingContextValue | null>(null);

/** Wraps the application with branding state. Default: ACC placeholder only. */
export function BrandingProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [branding, setBranding] = useState(DEFAULT_BRANDING_CONFIG);

  return (
    <BrandingContext.Provider value={{ branding, setBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

/** Returns the current branding context. Must be called inside BrandingProvider. */
export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext);
  if (ctx === null) throw new Error('useBranding must be used inside BrandingProvider');
  return ctx;
}
