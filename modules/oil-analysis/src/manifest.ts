// modules/oil-analysis/src/manifest.ts
// Module manifest for the Oil Analysis module.

import type { ModuleManifest } from '@acc-reliability/sdk';

/**
 * Static descriptor for the Oil Analysis module.
 */
export const OIL_ANALYSIS_MANIFEST: ModuleManifest = {
  moduleId: 'oil-analysis',
  displayName: 'Oil Analysis',
  version: '1.0.0',
  requiredPlatformVersion: '0.1.0',
  requiredSdkVersion: '0.1.0',
  description: 'Laboratory oil analysis sample intake, results, and anomaly monitoring.',
} as const;
