// platform/sdk/src/providers/resolve-master-data-repository-providers.ts
// Provider selection for Equipment and Lubrication Point master-data repositories.

import { AppsScriptNotConfiguredError } from '../apps-script/apps-script-api-errors';

import type { IEquipmentRepositoryProvider } from './equipment-repository-provider';
import { GoogleSheetsEquipmentRepositoryProvider } from './impl/google-sheets-equipment-repository-provider';
import { GoogleSheetsLubricationPointRepositoryProvider } from './impl/google-sheets-lubrication-point-repository-provider';
import { LocalStorageEquipmentRepositoryProvider } from './impl/local-storage-equipment-repository-provider';
import { LocalStorageLubricationPointRepositoryProvider } from './impl/local-storage-lubrication-point-repository-provider';
import type { ILubricationPointRepositoryProvider } from './lubrication-point-repository-provider';
import type { MasterDataRepositoryProviderContext } from './master-data-repository-provider-context';
import {
  DEFAULT_MASTER_DATA_REPOSITORY_PROVIDER,
  type MasterDataRepositoryProviderKind,
} from './master-data-repository-provider-kind';

function requireAppsScriptClient(
  context: MasterDataRepositoryProviderContext | undefined,
  domain: 'equipment' | 'lubricationPoints',
): NonNullable<MasterDataRepositoryProviderContext['appsScriptClient']> {
  const client = context?.appsScriptClient;
  if (!client?.isConfigured()) {
    throw new AppsScriptNotConfiguredError(undefined, {
      domain,
      apiMode: context?.apiMode,
    });
  }
  return client;
}

export function createEquipmentRepositoryProvider(
  kind: MasterDataRepositoryProviderKind = DEFAULT_MASTER_DATA_REPOSITORY_PROVIDER,
  context?: MasterDataRepositoryProviderContext,
): IEquipmentRepositoryProvider {
  switch (kind) {
    case 'googleSheets':
      return new GoogleSheetsEquipmentRepositoryProvider(
        requireAppsScriptClient(context, 'equipment'),
      );
    case 'localStorage':
    default:
      return new LocalStorageEquipmentRepositoryProvider();
  }
}

export function createLubricationPointRepositoryProvider(
  kind: MasterDataRepositoryProviderKind = DEFAULT_MASTER_DATA_REPOSITORY_PROVIDER,
  context?: MasterDataRepositoryProviderContext,
): ILubricationPointRepositoryProvider {
  switch (kind) {
    case 'googleSheets':
      return new GoogleSheetsLubricationPointRepositoryProvider(
        requireAppsScriptClient(context, 'lubricationPoints'),
      );
    case 'localStorage':
    default:
      return new LocalStorageLubricationPointRepositoryProvider();
  }
}
