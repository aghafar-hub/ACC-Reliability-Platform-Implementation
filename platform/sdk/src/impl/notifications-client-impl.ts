// platform/sdk/src/impl/notifications-client-impl.ts
// Concrete INotificationsClient — delegates to INotificationService.
//
// Context-awareness:
//   - list() scopes results to the current user's contractor.
//   - dismiss() passes the current userId to the service.
//   - acknowledge() is a no-op at the service level (no 'read' status yet);
//     it verifies the record exists and resolves successfully.

import type {
  INotificationService,
  NotificationId,
  NotificationRecord,
  NotificationRequest,
} from '@acc-reliability/services';
import { NotificationNotFoundError } from '@acc-reliability/services';
import type {
  INotificationsClient,
  NotificationListFilter,
} from '../clients/notifications-client';
import type { SdkContext } from '../sdk-context';

/**
 * Notification client backed by the in-memory {@link INotificationService}.
 *
 * Each SDK instance holds one `NotificationsClientImpl` bound to the session
 * context.  The `list()` and `dismiss()` methods use `context.currentUser`
 * for contractor scoping and identity resolution.
 */
export class NotificationsClientImpl implements INotificationsClient {
  constructor(
    private readonly service: INotificationService,
    private readonly context: SdkContext,
  ) {}

  async send(request: NotificationRequest): Promise<NotificationRecord> {
    return this.service.send(request);
  }

  async acknowledge(id: NotificationId): Promise<void> {
    // No 'acknowledged' / 'read' transition in the current service model.
    // Verify the record exists so callers get NotificationNotFoundError on
    // unknown ids, and resolve successfully otherwise.
    const record = this.service.getRecord(id);
    if (record === null) {
      throw new NotificationNotFoundError(id);
    }
    // Future: call service.acknowledge(id, userId) when that transition is added.
  }

  async dismiss(id: NotificationId): Promise<void> {
    this.service.dismiss(id, this.context.currentUser.userId);
  }

  async list(filter?: NotificationListFilter): Promise<readonly NotificationRecord[]> {
    const { userId, contractorId } = this.context.currentUser;
    const records = this.service.getRecordsForRecipient(userId, contractorId);

    if (filter?.status !== undefined) {
      const { status } = filter;
      return records.filter((r) => r.status === status);
    }

    return records;
  }
}
