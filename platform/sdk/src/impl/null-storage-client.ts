// platform/sdk/src/impl/null-storage-client.ts
// Placeholder IStorageClient — storage wiring is not yet implemented.
//
// getRepository() throws immediately so any module that accidentally calls
// storage during the bootstrap phase gets a clear error rather than a
// silent null pointer.
//
// Replace with a real ContractorScopedStorageClient in the storage milestone.

import { PlatformError } from '@acc-reliability/kernel';
import type { Entity, IRepository } from '@acc-reliability/services';
import type { IStorageClient } from '../clients/storage-client';

/**
 * No-op storage client used during the pre-storage bootstrap phase.
 *
 * @remarks
 * Registered under the `storage` slot in {@link PlatformSdk} until the
 * storage abstraction layer is wired.  Calling {@link getRepository} throws a
 * typed not-implemented error rather than returning a broken repository.
 */
export class NullStorageClient implements IStorageClient {
  getRepository<T extends Entity>(_entityType: string): IRepository<T> {
    throw new PlatformError(
      'Storage is not yet implemented. Wire a real IStorageProvider before calling getRepository().',
      'STORAGE_NOT_IMPLEMENTED',
    );
  }
}
