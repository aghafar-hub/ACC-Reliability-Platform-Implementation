// platform/sdk/src/apps-script/apps-script-repository-support.ts
// Shared helpers for Apps Script-backed master-data repositories.

import type { IAppsScriptApiClient } from './apps-script-api-client';
import { AppsScriptNotConfiguredError } from './apps-script-api-errors';
import type { AppsScriptEndpoint } from './contracts/apps-script-endpoints';

export const DEFAULT_APPS_SCRIPT_LIST_LIMIT = 200;

export function requireConfiguredAppsScriptClient(client: IAppsScriptApiClient): void {
  if (!client.isConfigured()) {
    throw new AppsScriptNotConfiguredError();
  }
}

export function executeAppsScriptRepositoryRequest<T>(
  client: IAppsScriptApiClient,
  endpoint: AppsScriptEndpoint,
  payload?: unknown,
): T {
  requireConfiguredAppsScriptClient(client);
  return client.requestSync<T>(endpoint, payload);
}

export function resolveListLimit(limit: number | undefined): number {
  return limit ?? DEFAULT_APPS_SCRIPT_LIST_LIMIT;
}

export function resolveListOffset(offset: number | undefined): number {
  return offset ?? 0;
}
