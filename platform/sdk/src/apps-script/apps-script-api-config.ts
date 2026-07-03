// platform/sdk/src/apps-script/apps-script-api-config.ts
// Configuration for the Apps Script HTTP API client.

/** Connection settings for {@link IAppsScriptApiClient}. */
export interface AppsScriptApiConfig {
  /** Deployed Google Apps Script web app URL (no trailing slash). */
  readonly baseUrl: string;
  /** Per-request timeout in milliseconds. */
  readonly timeoutMs: number;
}

export const DEFAULT_APPS_SCRIPT_TIMEOUT_MS = 30_000;
