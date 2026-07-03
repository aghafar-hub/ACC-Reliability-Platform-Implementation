// apps/owner-center/src/context/SdkContext.tsx
// Platform SDK context — holds the single bootstrapped SDK instance for the
// Owner Center lifecycle.  All pages and hooks access the SDK through
// usePlatformSdk(); no component imports platform packages directly.

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { bootstrapPlatformSdk, type IPlatformSdk } from '@acc-reliability/sdk';
import {
  logOwnerCenterBootstrapWarnings,
  resolveOwnerCenterSdkBootstrap,
  usesAppsScriptBootstrapOptions,
  type MasterDataProviderMode,
} from '../config/sdk-bootstrap-config';
import { setPlatformSdk } from '../modules/platform/platform-master-access';

// ── Internal state ────────────────────────────────────────────────────────────

type SdkState =
  | { status: 'loading' }
  | { status: 'ready'; sdk: IPlatformSdk; masterDataProvider: MasterDataProviderMode }
  | { status: 'error'; message: string };

// ── Context ───────────────────────────────────────────────────────────────────

const SdkReactContext = createContext<IPlatformSdk | null>(null);
const MasterDataProviderContext = createContext<MasterDataProviderMode>('local');

async function bootstrapOwnerCenterSdk(): Promise<{
  sdk: IPlatformSdk;
  masterDataProvider: MasterDataProviderMode;
}> {
  const resolved = resolveOwnerCenterSdkBootstrap();
  logOwnerCenterBootstrapWarnings(resolved.warnings);

  if (!resolved.usedAppsScriptConfig || !resolved.bootstrapOptions) {
    const { sdk } = await bootstrapPlatformSdk();
    return { sdk, masterDataProvider: 'local' };
  }

  try {
    const { sdk } = await bootstrapPlatformSdk(resolved.bootstrapOptions);
    return { sdk, masterDataProvider: resolved.masterDataProvider };
  } catch (error) {
    if (!usesAppsScriptBootstrapOptions(resolved.bootstrapOptions)) {
      throw error;
    }

    console.warn(
      '[ACC Owner Center]',
      'Apps Script SDK bootstrap failed; falling back to localStorage.',
      error instanceof Error ? error.message : error,
    );

    const { sdk } = await bootstrapPlatformSdk();
    return { sdk, masterDataProvider: 'local' };
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function SdkProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [state, setState] = useState<SdkState>({ status: 'loading' });
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    bootstrapOwnerCenterSdk()
      .then(({ sdk, masterDataProvider }) => {
        setPlatformSdk(sdk);
        setState({ status: 'ready', sdk, masterDataProvider });
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
      <MasterDataProviderContext.Provider value={state.masterDataProvider}>
        {children}
      </MasterDataProviderContext.Provider>
    </SdkReactContext.Provider>
  );
}

// ── Public hooks ──────────────────────────────────────────────────────────────

export function usePlatformSdk(): IPlatformSdk {
  const sdk = useContext(SdkReactContext);
  if (sdk === null) {
    throw new Error('usePlatformSdk() must be called inside <SdkProvider>.');
  }
  return sdk;
}

export function useMasterDataProviderMode(): MasterDataProviderMode {
  return useContext(MasterDataProviderContext);
}
