// platform/sdk/src/clients/actions-client.ts
// SDK actions client interface.
//
// Business modules interact with the platform Action Center through this
// client only (PS-114 §9).  Modules must never implement independent
// action tracking or lifecycle management.

import type {
  ActionId,
  ActionRecord,
  ActionCreateRequest,
  ActionUpdateRequest,
} from '@acc-reliability/services';

/**
 * SDK action center client.
 *
 * Covers the four operations prescribed by PS-114 §9 plus a read method
 * so modules can inspect action state without fetching from storage directly.
 *
 * All write operations are contractor-scoped automatically from SdkContext.
 */
export interface IActionsClient {
  /**
   * Creates a new action and returns the persisted {@link ActionRecord}.
   *
   * @param request Action creation parameters.
   * @throws {ActionScopeError} if the requesting contractor does not match
   *   the action's contractorId (non-AppOwner callers only).
   */
  create(request: ActionCreateRequest): Promise<ActionRecord>;

  /**
   * Applies partial updates to an existing action.
   *
   * Only fields present in `changes` are modified; absent fields are
   * preserved (partial update semantics).
   *
   * @param id      Identifier of the action to update.
   * @param changes Fields to modify.
   * @throws {ActionNotFoundError} if `id` does not exist.
   */
  update(id: ActionId, changes: ActionUpdateRequest): Promise<ActionRecord>;

  /**
   * Transitions an action to the `Closed` status.
   *
   * @param id      Identifier of the action to close.
   * @param remarks Optional closure remarks recorded in the action history.
   * @throws {ActionNotFoundError} if `id` does not exist.
   * @throws {ActionTransitionError} if the action cannot be closed from its
   *   current status.
   */
  close(id: ActionId, remarks?: string): Promise<ActionRecord>;

  /**
   * Links two actions, indicating that `sourceId` is related to or depends
   * on `targetId`.
   *
   * @param sourceId The originating action.
   * @param targetId The related action.
   * @throws {ActionNotFoundError} if either id does not exist.
   */
  link(sourceId: ActionId, targetId: ActionId): Promise<void>;

  /**
   * Returns the action with the given id, or `null` if it does not exist
   * within the current contractor scope.
   *
   * @param id Identifier of the action to retrieve.
   */
  findById(id: ActionId): Promise<ActionRecord | null>;
}
