// platform/sdk/src/apps-script/resolve-apps-script-bootstrap.ts
// Apps Script bootstrap configuration and validation.

import type { IConfigManager } from '@acc-reliability/kernel';

import type { SdkBootstrapOptions } from '../sdk-bootstrap-options';
import type { MasterDataRepositoryProviderKind } from '../providers/master-data-repository-provider-kind';
import {
  DEFAULT_APPS_SCRIPT_TIMEOUT_MS,
  type AppsScriptApiConfig,
} from './apps-script-api-config';
import { AppsScriptNotConfiguredError } from './apps-script-api-errors';
import { DEFAULT_SDK_API_MODE, type SdkApiMode } from './apps-script-api-mode';
import { createAppsScriptApiClient } from './impl/apps-script-api-client-impl';
import type { IAppsScriptApiClient } from './apps-script-api-client';

export interface ResolvedAppsScriptBootstrap {
  readonly apiMode: SdkApiMode;
  readonly config: AppsScriptApiConfig | null;
  readonly client: IAppsScriptApiClient | null;
}

export function resolveAppsScriptBootstrap(
  options: SdkBootstrapOptions | undefined,
  configManager: IConfigManager,
  equipmentProviderKind: MasterDataRepositoryProviderKind,
  lubricationPointProviderKind: MasterDataRepositoryProviderKind,
): ResolvedAppsScriptBootstrap {
  const apiMode = options?.apiMode ?? DEFAULT_SDK_API_MODE;
  const queryTimeoutMs = configManager.get().storage.queryTimeoutMs;
  const baseUrl = options?.appsScriptBaseUrl?.trim() ?? '';

  const needsAppsScriptUrl =
    apiMode === 'appsScript'
    || equipmentProviderKind === 'googleSheets'
    || lubricationPointProviderKind === 'googleSheets';

  if (needsAppsScriptUrl && !baseUrl) {
    throw new AppsScriptNotConfiguredError(undefined, {
      apiMode,
      equipmentProvider: equipmentProviderKind,
      lubricationPointProvider: lubricationPointProviderKind,
    });
  }

  if (!baseUrl) {
    return { apiMode, config: null, client: null };
  }

  const config: AppsScriptApiConfig = {
    baseUrl,
    timeoutMs: options?.appsScriptTimeoutMs ?? queryTimeoutMs ?? DEFAULT_APPS_SCRIPT_TIMEOUT_MS,
  };

  return {
    apiMode,
    config,
    client: createAppsScriptApiClient(config),
  };
}
