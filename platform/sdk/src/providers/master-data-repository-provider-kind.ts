// platform/sdk/src/providers/master-data-repository-provider-kind.ts
// Master-data repository backend selection for Equipment and Lubrication Points.

/**
 * Supported persistence backends for platform master-data repositories.
 *
 * - `localStorage` — browser localStorage (default; current production path).
 * - `googleSheets` — Google Sheets via Apps Script (stub only; future sprint).
 */
export type MasterDataRepositoryProviderKind = 'localStorage' | 'googleSheets';

export const MASTER_DATA_REPOSITORY_PROVIDER_KINDS = [
  'localStorage',
  'googleSheets',
] as const satisfies readonly MasterDataRepositoryProviderKind[];

/** Default master-data repository provider for Equipment and Lubrication Points. */
export const DEFAULT_MASTER_DATA_REPOSITORY_PROVIDER: MasterDataRepositoryProviderKind =
  'localStorage';
