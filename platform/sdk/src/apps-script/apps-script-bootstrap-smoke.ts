// platform/sdk/src/apps-script/apps-script-bootstrap-smoke.ts
// Internal smoke helper for manual Apps Script master-data verification.
//
// Not used by Owner Center default bootstrap. Call from a dev console after
// bootstrapping with googleSheets providers.

import type { IPlatformSdk } from '../platform-sdk';

/**
 * Runs a minimal read smoke test against Apps Script-backed master data.
 *
 * @example
 * ```ts
 * const { sdk } = await bootstrapPlatformSdk({
 *   apiMode: 'appsScript',
 *   appsScriptBaseUrl: 'https://script.google.com/macros/s/.../exec',
 *   repositoryProviders: {
 *     equipment: 'googleSheets',
 *     lubricationPoints: 'googleSheets',
 *   },
 * });
 *
 * const summary = smokeAppsScriptMasterData(sdk);
 * console.info(summary);
 * ```
 */
export function smokeAppsScriptMasterData(sdk: IPlatformSdk): {
  readonly equipmentTotal: number;
  readonly lubricationPointTotal: number;
  readonly sampleEquipmentId: string | null;
  readonly sampleLpId: string | null;
} {
  const equipmentList = sdk.equipment.list({ limit: 1 });
  const lubricationPointList = sdk.lubricationPoints.list({ limit: 1 });

  return {
    equipmentTotal: equipmentList.total,
    lubricationPointTotal: lubricationPointList.total,
    sampleEquipmentId: equipmentList.equipment[0]?.equipmentId ?? null,
    sampleLpId: lubricationPointList.lubricationPoints[0]?.lpId ?? null,
  };
}
