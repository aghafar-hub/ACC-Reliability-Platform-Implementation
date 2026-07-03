// platform/sdk/src/providers/impl/local-storage-lubrication-point-repository-provider.ts

import { InMemoryLubricationPointRepository } from '@acc-reliability/services';
import type { ILubricationPointRepository } from '@acc-reliability/services';

import { LocalStorageLubricationPointRepository } from '../../impl/local-storage-lubrication-point-repository';
import type { ILubricationPointRepositoryProvider } from '../lubrication-point-repository-provider';

export class LocalStorageLubricationPointRepositoryProvider
  implements ILubricationPointRepositoryProvider
{
  readonly kind = 'localStorage' as const;

  createRepository(): ILubricationPointRepository {
    return typeof window !== 'undefined'
      ? new LocalStorageLubricationPointRepository()
      : new InMemoryLubricationPointRepository();
  }
}
