// platform/sdk/src/sdk-bootstrap-options.ts
// Bootstrap option types for platform SDK initialization.

import type { SdkApiMode } from './apps-script/apps-script-api-mode';
import type { MasterDataRepositoryProviderKind } from './providers/master-data-repository-provider-kind';

/**
 * Optional overrides passed to {@link bootstrapPlatformSdk}.
 *
 * Owner Center uses the default local persistence path. To exercise Apps Script
 * master-data repositories manually, pass:
 *
 * @example
 * ```ts
 * await bootstrapPlatformSdk({
 *   apiMode: 'appsScript',
 *   appsScriptBaseUrl: 'https://script.google.com/macros/s/.../exec',
 *   repositoryProviders: {
 *     equipment: 'googleSheets',
 *     lubricationPoints: 'googleSheets',
 *   },
 * });
 * ```
 */
export interface SdkBootstrapOptions {
  /** API transport mode. Default: `local`. */
  readonly apiMode?: SdkApiMode;
  /** Google Apps Script web app base URL. Required when apiMode is `appsScript` or master-data provider is `googleSheets`. */
  readonly appsScriptBaseUrl?: string;
  /** Per-request Apps Script timeout override in milliseconds. */
  readonly appsScriptTimeoutMs?: number;
  readonly repositoryProviders?: {
    readonly equipment?: MasterDataRepositoryProviderKind;
    readonly lubricationPoints?: MasterDataRepositoryProviderKind;
  };
}
