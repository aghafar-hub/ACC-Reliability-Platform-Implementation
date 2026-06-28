// platform/sdk/src/clients/notifications-client.ts
// SDK notifications client interface.
//
// Business modules request notifications through this client only (PS-114 §10).
// Modules must never build their own notification delivery logic.

import type {
  NotificationId,
  NotificationRequest,
  NotificationRecord,
  NotificationStatus,
} from '@acc-reliability/services';

/**
 * Filter options for listing notification records.
 */
export interface NotificationListFilter {
  /** When provided, only notifications with this status are returned. */
  readonly status?: NotificationStatus | undefined;
}

/**
 * SDK notifications client.
 *
 * All delivery, queuing, and routing is performed by the platform.
 * Business modules request notifications; they do not implement them.
 */
export interface INotificationsClient {
  /**
   * Submits a notification request to the platform.
   *
   * @param request Fully-specified notification including recipients and content.
   * @returns The persisted {@link NotificationRecord} with assigned id and status.
   * @throws {NotificationRecipientError} if the recipient list is empty or invalid.
   */
  send(request: NotificationRequest): Promise<NotificationRecord>;

  /**
   * Marks a notification as acknowledged by the current user.
   *
   * @param id Identifier of the notification to acknowledge.
   * @throws {NotificationNotFoundError} if `id` does not exist.
   */
  acknowledge(id: NotificationId): Promise<void>;

  /**
   * Dismisses a notification, removing it from the active view.
   *
   * @param id Identifier of the notification to dismiss.
   * @throws {NotificationNotFoundError} if `id` does not exist.
   */
  dismiss(id: NotificationId): Promise<void>;

  /**
   * Returns notifications visible to the current user, optionally filtered
   * by status.
   *
   * Results are scoped to the current user's contractor unless the user holds
   * the AppOwner role (GLOBAL scope).
   *
   * @param filter Optional filter; when omitted, all statuses are returned.
   */
  list(filter?: NotificationListFilter): Promise<readonly NotificationRecord[]>;
}
