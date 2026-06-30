// apps/owner-center/src/context/SdkContext.tsx
// Platform SDK context — holds the single bootstrapped SDK instance for the
// Owner Center lifecycle.  All pages and hooks access the SDK through
// usePlatformSdk(); no component imports platform packages directly.

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { bootstrapPlatformSdk, type IPlatformSdk } from '@acc-reliability/sdk';

// ── Internal state ────────────────────────────────────────────────────────────

type SdkState =
  | { status: 'loading' }
  | { status: 'ready'; sdk: IPlatformSdk }
  | { status: 'error'; message: string };

// ── Context ───────────────────────────────────────────────────────────────────

const SdkReactContext = createContext<IPlatformSdk | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function SdkProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [state, setState] = useState<SdkState>({ status: 'loading' });
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    bootstrapPlatformSdk()
      .then(({ sdk }) => {
        setState({ status: 'ready', sdk });
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Platform SDK failed to initialize.';
        setState({ status: 'error', message });
      });
  }, []);

  if (state.status === 'loading') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontFamily: 'sans-serif',
          color: '#555',
        }}
      >
        Initializing platform…
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontFamily: 'sans-serif',
          color: '#c0392b',
          gap: '0.5rem',
        }}
      >
        <strong>Platform initialization failed</strong>
        <span style={{ fontSize: '0.875rem', color: '#888' }}>{state.message}</span>
      </div>
    );
  }

  return (
    <SdkReactContext.Provider value={state.sdk}>
      {children}
    </SdkReactContext.Provider>
  );
}

// ── Public hook ───────────────────────────────────────────────────────────────

export function usePlatformSdk(): IPlatformSdk {
  const sdk = useContext(SdkReactContext);
  if (sdk === null) {
    throw new Error('usePlatformSdk() must be called inside <SdkProvider>.');
  }
  return sdk;
}
