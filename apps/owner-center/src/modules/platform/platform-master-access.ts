// apps/owner-center/src/modules/platform/platform-master-access.ts
// Bridge from app-layer services to the bootstrapped Platform SDK.
// Set once by SdkProvider after bootstrapPlatformSdk() completes.

import type { IPlatformSdk } from '@acc-reliability/sdk';

let sdkRef: IPlatformSdk | null = null;

export function setPlatformSdk(sdk: IPlatformSdk): void {
  sdkRef = sdk;
}

export function getPlatformSdk(): IPlatformSdk {
  if (sdkRef === null) {
    throw new Error('Platform SDK is not initialized. Ensure SdkProvider has mounted.');
  }
  return sdkRef;
}

export function isPlatformSdkReady(): boolean {
  return sdkRef !== null;
}
