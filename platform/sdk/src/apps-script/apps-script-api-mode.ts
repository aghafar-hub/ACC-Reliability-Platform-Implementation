// platform/sdk/src/apps-script/apps-script-api-mode.ts
// SDK API transport mode for master-data and Apps Script integration.

/**
 * Controls whether the SDK uses local persistence or the Apps Script HTTP API.
 *
 * - `local` — browser localStorage / in-memory (default).
 * - `appsScript` — Google Apps Script web app endpoint (future runtime path).
 */
export type SdkApiMode = 'local' | 'appsScript';

export const SDK_API_MODES = ['local', 'appsScript'] as const satisfies readonly SdkApiMode[];

/** Default SDK API mode — local persistence only. */
export const DEFAULT_SDK_API_MODE: SdkApiMode = 'local';
