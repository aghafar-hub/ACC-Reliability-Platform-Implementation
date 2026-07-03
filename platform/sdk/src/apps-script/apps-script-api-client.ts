// platform/sdk/src/apps-script/apps-script-api-client.ts
// Generic HTTP client contract for the Google Apps Script web app API.

import type { AppsScriptApiConfig } from './apps-script-api-config';
import type { AppsScriptEndpoint } from './contracts/apps-script-endpoints';

export interface AppsScriptApiRequestOptions {
  readonly timeoutMs?: number;
  readonly headers?: Readonly<Record<string, string>>;
}

/**
 * Low-level Apps Script API client.
 *
 * Routing:
 * - GET: `?action=<endpoint>&...queryParams`
 * - POST: `{ "action": "<endpoint>", ...payload }`
 *
 * Response envelope: `{ ok: true, data }` or `{ ok: false, error: { code, message, details? } }`
 *
 * Repository implementations depend on this interface — not on `fetch` directly.
 */
export interface IAppsScriptApiClient {
  readonly config: Readonly<AppsScriptApiConfig>;
  isConfigured(): boolean;
  request<T>(
    endpoint: AppsScriptEndpoint,
    payload?: unknown,
    options?: AppsScriptApiRequestOptions,
  ): Promise<T>;
  /**
   * Synchronous request for repository implementations backed by the sync platform
   * service interface. Requires browser `XMLHttpRequest`.
   */
  requestSync<T>(
    endpoint: AppsScriptEndpoint,
    payload?: unknown,
    options?: AppsScriptApiRequestOptions,
  ): T;
  get<T>(
    endpoint: AppsScriptEndpoint,
    query?: Readonly<Record<string, string | number | boolean | undefined>>,
    options?: AppsScriptApiRequestOptions,
  ): Promise<T>;
  getSync<T>(
    endpoint: AppsScriptEndpoint,
    query?: Readonly<Record<string, string | number | boolean | undefined>>,
    options?: AppsScriptApiRequestOptions,
  ): T;
  post<T>(
    endpoint: AppsScriptEndpoint,
    payload?: unknown,
    options?: AppsScriptApiRequestOptions,
  ): Promise<T>;
  postSync<T>(
    endpoint: AppsScriptEndpoint,
    payload?: unknown,
    options?: AppsScriptApiRequestOptions,
  ): T;
}
