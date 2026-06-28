// platform/storage/src/write-result.ts
// Standard output envelope for storage write operations.
//
// All create/update/delete operations in the storage layer return a WriteResult
// so callers have a consistent type to inspect without catching exceptions for
// normal control flow.  Exceptions are still thrown for unexpected failures.

import type { Entity } from '@acc-reliability/services';

/**
 * Discriminant indicating which write operation produced this result.
 *
 *  - `'created'` — a new entity was persisted; `entity` carries the
 *                  provider-assigned `id` and any generated fields.
 *  - `'updated'` — an existing entity was partially or fully replaced;
 *                  `entity` is the post-update snapshot.
 *  - `'deleted'` — an entity was permanently removed; `entity` is the
 *                  last known snapshot before deletion.
 */
export type WriteResultKind = 'created' | 'updated' | 'deleted';

/**
 * Result returned by every storage write operation.
 *
 * @typeParam T - Entity type that was written.  Must extend {@link Entity}.
 *
 * Design notes:
 *  - `entity` is always present; callers never need to re-fetch after a write.
 *  - `affectedRows` is optional; SQL-backed providers populate it for
 *    observability.  Google Sheets and Mock providers may omit it.
 *  - The envelope is intentionally thin — no error information belongs here.
 *    Write failures are communicated via thrown errors (`StorageError` and
 *    its subclasses), not via a result field.
 */
export interface WriteResult<T extends Entity> {
  /** Which write operation produced this result. */
  readonly kind: WriteResultKind;
  /**
   * The entity as it exists in storage immediately after the operation.
   *
   * For `'deleted'` results this is the last known snapshot; the entity no
   * longer exists in the backing store.
   */
  readonly entity: T;
  /**
   * Number of storage rows (or equivalent) affected by the operation.
   *
   * Provided by SQL-backed providers for diagnostics and audit purposes.
   * Omitted by providers that do not have a meaningful row-count concept
   * (e.g. Google Sheets, Mock).
   */
  readonly affectedRows?: number | undefined;
}
