// platform/sdk/src/providers/master-data-repository-provider-context.ts
// Shared context for master-data repository provider factories.

import type { IAppsScriptApiClient } from '../apps-script/apps-script-api-client';
import type { SdkApiMode } from '../apps-script/apps-script-api-mode';

export interface MasterDataRepositoryProviderContext {
  readonly apiMode: SdkApiMode;
  readonly appsScriptClient: IAppsScriptApiClient | null;
}
