// platform/sdk/src/providers/lubrication-point-repository-provider.ts
// Repository provider contract for Lubrication Point master data.

import type { ILubricationPointRepository } from '@acc-reliability/services';

import type { MasterDataRepositoryProviderKind } from './master-data-repository-provider-kind';

/**
 * Factory for {@link ILubricationPointRepository} implementations.
 *
 * Bootstrap selects a concrete provider; services and SDK clients depend only
 * on {@link ILubricationPointRepository}, never on provider-specific classes.
 */
export interface ILubricationPointRepositoryProvider {
  readonly kind: MasterDataRepositoryProviderKind;
  createRepository(): ILubricationPointRepository;
}
