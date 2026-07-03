// platform/sdk/src/providers/impl/local-storage-equipment-repository-provider.ts

import { InMemoryEquipmentRepository } from '@acc-reliability/services';
import type { IEquipmentRepository } from '@acc-reliability/services';

import { LocalStorageEquipmentRepository } from '../../impl/local-storage-equipment-repository';
import type { IEquipmentRepositoryProvider } from '../equipment-repository-provider';

export class LocalStorageEquipmentRepositoryProvider implements IEquipmentRepositoryProvider {
  readonly kind = 'localStorage' as const;

  createRepository(): IEquipmentRepository {
    return typeof window !== 'undefined'
      ? new LocalStorageEquipmentRepository()
      : new InMemoryEquipmentRepository();
  }
}
