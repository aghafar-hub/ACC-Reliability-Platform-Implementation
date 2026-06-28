// platform/sdk/src/clients/storage-client.ts
// SDK storage client interface.
//
// Business modules access storage exclusively through this client (PS-114 §2).
// ContractorScopeFilter is embedded from SdkContext at client creation time;
// modules never pass contractor ids per-call.

import type { Entity, IRepository } from '@acc-reliability/storage';

/**
 * SDK storage client.
 *
 * Provides contractor-scoped repository access.  The scope (GLOBAL,
 * CONTRACTOR, or DENY) is fixed when the SDK is initialized from
 * {@link SdkContext}; it is applied transparently to every repository
 * operation.  Business modules never reference {@link ContractorScopeFilter}
 * directly.
 *
 * Design rules (PS-114, PS-003):
 *  - Modules obtain repositories only through this interface.
 *  - Modules must never instantiate storage providers directly.
 *  - Cross-contractor data access is impossible through the repository API;
 *    the scope filter enforces isolation at the storage layer.
 */
export interface IStorageClient {
  /**
   * Returns a contractor-scoped repository for the named entity type.
   *
   * `entityType` is the stable logical name (e.g. `'equipment'`,
   * `'oilSample'`).  The underlying provider maps this to the appropriate
   * backend construct (sheet tab name, table name, etc.).
   *
   * @param entityType Logical entity type name; stable across provider migrations.
   * @returns A repository whose reads and writes are automatically scoped to
   *   the contractor derived from {@link SdkContext}.
   * @throws {Error} if the current scope is `'DENY'`.
   */
  getRepository<T extends Entity>(entityType: string): IRepository<T>;
}
