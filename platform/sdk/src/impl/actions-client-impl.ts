// platform/sdk/src/impl/actions-client-impl.ts
// Concrete IActionsClient — delegates to IActionService.
//
// Bridging:
//   - All IActionService methods are synchronous; the client wraps each in
//     Promise.resolve() to satisfy the async IActionsClient contract.
//   - close() invokes the service's close() using the context userId then
//     optionally appends the closure remarks as a comment.
//   - link() reads the current record's relatedActionIds and calls update()
//     with the deduplicated extended list.

import type {
  ActionCreateRequest,
  ActionId,
  ActionRecord,
  ActionUpdateRequest,
  IActionService,
} from '@acc-reliability/services';
import { ActionNotFoundError } from '@acc-reliability/services';
import type { IActionsClient } from '../clients/actions-client';
import type { SdkContext } from '../sdk-context';

/**
 * Action client backed by the in-memory {@link IActionService}.
 *
 * The client is synchronous under the hood — all Promise wrapping is
 * cosmetic; the underlying service calls complete immediately.
 */
export class ActionsClientImpl implements IActionsClient {
  constructor(
    private readonly service: IActionService,
    private readonly context: SdkContext,
  ) {}

  async create(request: ActionCreateRequest): Promise<ActionRecord> {
    return Promise.resolve(this.service.create(request));
  }

  async update(id: ActionId, changes: ActionUpdateRequest): Promise<ActionRecord> {
    return Promise.resolve(this.service.update(id, changes));
  }

  async close(id: ActionId, remarks?: string): Promise<ActionRecord> {
    const userId = this.context.currentUser.userId;
    const record = this.service.close(id, userId);

    if (remarks !== undefined && remarks.trim().length > 0) {
      return Promise.resolve(
        this.service.addComment(id, {
          authorId: userId,
          contractorId: this.context.currentUser.contractorId,
          body: remarks,
        }),
      );
    }

    return Promise.resolve(record);
  }

  async link(sourceId: ActionId, targetId: ActionId): Promise<void> {
    const source = this.service.getById(sourceId);
    if (source === null) {
      throw new ActionNotFoundError(sourceId);
    }

    // Ensure targetId exists
    const target = this.service.getById(targetId);
    if (target === null) {
      throw new ActionNotFoundError(targetId);
    }

    // Deduplicate — do not add if already linked
    if (source.relatedActionIds.includes(targetId)) {
      return;
    }

    const extended: readonly ActionId[] = [...source.relatedActionIds, targetId];
    this.service.update(sourceId, {
      requestedBy: this.context.currentUser.userId,
      relatedActionIds: extended,
    });
  }

  async findById(id: ActionId): Promise<ActionRecord | null> {
    return Promise.resolve(this.service.getById(id));
  }
}
