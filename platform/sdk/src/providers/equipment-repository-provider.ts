// platform/sdk/src/providers/equipment-repository-provider.ts
// Repository provider contract for Equipment master data.

import type { IEquipmentRepository } from '@acc-reliability/services';

import type { MasterDataRepositoryProviderKind } from './master-data-repository-provider-kind';

/**
 * Factory for {@link IEquipmentRepository} implementations.
 *
 * Bootstrap selects a concrete provider; services and SDK clients depend only
 * on {@link IEquipmentRepository}, never on provider-specific classes.
 */
export interface IEquipmentRepositoryProvider {
  readonly kind: MasterDataRepositoryProviderKind;
  createRepository(): IEquipmentRepository;
}
