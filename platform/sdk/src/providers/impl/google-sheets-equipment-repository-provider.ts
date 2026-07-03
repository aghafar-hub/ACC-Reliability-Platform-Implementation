// platform/sdk/src/providers/impl/google-sheets-equipment-repository-provider.ts

import type { IEquipmentRepository } from '@acc-reliability/services';

import type { IAppsScriptApiClient } from '../../apps-script/apps-script-api-client';
import { AppsScriptEquipmentRepository } from '../../impl/apps-script-equipment-repository';
import type { IEquipmentRepositoryProvider } from '../equipment-repository-provider';

export class GoogleSheetsEquipmentRepositoryProvider implements IEquipmentRepositoryProvider {
  readonly kind = 'googleSheets' as const;

  constructor(private readonly client: IAppsScriptApiClient) {}

  createRepository(): IEquipmentRepository {
    return new AppsScriptEquipmentRepository(this.client);
  }
}
