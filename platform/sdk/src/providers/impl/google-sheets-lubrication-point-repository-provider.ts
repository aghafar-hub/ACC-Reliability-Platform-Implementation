// platform/sdk/src/providers/impl/google-sheets-lubrication-point-repository-provider.ts

import type { ILubricationPointRepository } from '@acc-reliability/services';

import type { IAppsScriptApiClient } from '../../apps-script/apps-script-api-client';
import { AppsScriptLubricationPointRepository } from '../../impl/apps-script-lubrication-point-repository';
import type { ILubricationPointRepositoryProvider } from '../lubrication-point-repository-provider';

export class GoogleSheetsLubricationPointRepositoryProvider
  implements ILubricationPointRepositoryProvider
{
  readonly kind = 'googleSheets' as const;

  constructor(private readonly client: IAppsScriptApiClient) {}

  createRepository(): ILubricationPointRepository {
    return new AppsScriptLubricationPointRepository(this.client);
  }
}
