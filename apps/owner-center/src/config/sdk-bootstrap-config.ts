// apps/owner-center/src/config/sdk-bootstrap-config.ts
// Resolves optional Apps Script master-data bootstrap options from Vite env vars.

import type { SdkApiMode, SdkBootstrapOptions } from '@acc-reliability/sdk';

export type MasterDataProviderMode = 'local' | 'appsScript';

export interface ResolvedOwnerCenterSdkBootstrap {
  readonly bootstrapOptions: SdkBootstrapOptions | undefined;
  readonly masterDataProvider: MasterDataProviderMode;
  readonly warnings: readonly string[];
  readonly usedAppsScriptConfig: boolean;
}

const LOG_PREFIX = '[ACC Owner Center]';

function readEnv(name: keyof ImportMetaEnv): string | undefined {
  const value = import.meta.env[name];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isValidAppsScriptBaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function parseApiMode(raw: string | undefined): SdkApiMode | undefined {
  if (raw === undefined) return undefined;
  if (raw === 'local' || raw === 'appsScript') return raw;
  return undefined;
}

function parseMasterDataProvider(
  raw: string | undefined,
): 'localStorage' | 'googleSheets' | undefined {
  if (raw === undefined) return undefined;
  if (raw === 'localStorage' || raw === 'googleSheets') return raw;
  return undefined;
}

function localBootstrapResult(warnings: readonly string[]): ResolvedOwnerCenterSdkBootstrap {
  return {
    bootstrapOptions: undefined,
    masterDataProvider: 'local',
    warnings,
    usedAppsScriptConfig: false,
  };
}

/**
 * Resolves Owner Center SDK bootstrap options from Vite environment variables.
 *
 * Falls back to localStorage when env values are missing or invalid.
 */
export function resolveOwnerCenterSdkBootstrap(): ResolvedOwnerCenterSdkBootstrap {
  const rawApiMode = readEnv('VITE_ACC_API_MODE');
  const rawBaseUrl = readEnv('VITE_ACC_APPS_SCRIPT_BASE_URL');
  const rawProvider = readEnv('VITE_ACC_MASTER_DATA_PROVIDER');

  const warnings: string[] = [];
  const apiMode = parseApiMode(rawApiMode);
  const masterDataProvider = parseMasterDataProvider(rawProvider);

  if (rawApiMode !== undefined && apiMode === undefined) {
    warnings.push(
      `Invalid VITE_ACC_API_MODE="${rawApiMode}". Expected "local" or "appsScript". Falling back to localStorage.`,
    );
  }

  if (rawProvider !== undefined && masterDataProvider === undefined) {
    warnings.push(
      `Invalid VITE_ACC_MASTER_DATA_PROVIDER="${rawProvider}". Expected "localStorage" or "googleSheets". Falling back to localStorage.`,
    );
  }

  const wantsAppsScriptApi = apiMode === 'appsScript';
  const wantsGoogleSheetsProvider = masterDataProvider === 'googleSheets';

  if (!wantsAppsScriptApi && !wantsGoogleSheetsProvider) {
    return localBootstrapResult(warnings);
  }

  if (!rawBaseUrl || !isValidAppsScriptBaseUrl(rawBaseUrl)) {
    warnings.push(
      'Apps Script master data was requested but VITE_ACC_APPS_SCRIPT_BASE_URL is missing or invalid. Falling back to localStorage.',
    );
    return localBootstrapResult(warnings);
  }

  const bootstrapOptions: SdkBootstrapOptions = {
    appsScriptBaseUrl: rawBaseUrl,
    ...(wantsAppsScriptApi ? { apiMode: 'appsScript' as const } : {}),
    ...(wantsGoogleSheetsProvider
      ? {
          repositoryProviders: {
            equipment: 'googleSheets' as const,
            lubricationPoints: 'googleSheets' as const,
          },
        }
      : {}),
  };

  return {
    bootstrapOptions,
    masterDataProvider: wantsGoogleSheetsProvider ? 'appsScript' : 'local',
    warnings,
    usedAppsScriptConfig: true,
  };
}

export function logOwnerCenterBootstrapWarnings(warnings: readonly string[]): void {
  for (const warning of warnings) {
    console.warn(LOG_PREFIX, warning);
  }
}

export function usesAppsScriptBootstrapOptions(
  options: SdkBootstrapOptions | undefined,
): boolean {
  if (!options) return false;
  return options.apiMode === 'appsScript'
    || options.repositoryProviders?.equipment === 'googleSheets'
    || options.repositoryProviders?.lubricationPoints === 'googleSheets';
}
