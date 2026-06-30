// platform/sdk/src/clients/notification-management-client.ts
// SDK Notification Management client interface.

import type {
  NotificationRuleRecord,
  NotificationObjectType,
  NotificationRuleStatus,
  NotificationRuleId,
  NotificationRuleSettings,
  CreateNotificationRuleRequest,
  UpdateNotificationRuleRequest,
  NotificationRuleListQuery,
  NotificationRuleListResult,
  NotificationManagementSummary,
} from '@acc-reliability/services';

export type {
  NotificationRuleRecord,
  NotificationObjectType,
  NotificationRuleStatus,
  NotificationRuleId,
  NotificationRuleSettings,
  CreateNotificationRuleRequest,
  UpdateNotificationRuleRequest,
  NotificationRuleListQuery,
  NotificationRuleListResult,
  NotificationManagementSummary,
};

/**
 * SDK Notification Management client.
 *
 * Manages notification configuration (rules, templates, channels, reminders,
 * escalations).  Does not send notifications — use {@link INotificationsClient}
 * for delivery.
 */
export interface INotificationManagementClient {
  create(request: CreateNotificationRuleRequest): NotificationRuleRecord;
  findById(id: NotificationRuleId): NotificationRuleRecord | null;
  findByKey(objectType: NotificationObjectType, ruleKey: string): NotificationRuleRecord | null;
  list(query?: NotificationRuleListQuery): NotificationRuleListResult;
  update(id: NotificationRuleId, request: UpdateNotificationRuleRequest): NotificationRuleRecord;
  enable(id: NotificationRuleId): NotificationRuleRecord;
  disable(id: NotificationRuleId, reason: string): NotificationRuleRecord;
  archive(id: NotificationRuleId, reason: string): NotificationRuleRecord;
  restore(id: NotificationRuleId): NotificationRuleRecord;
  getSummary(): NotificationManagementSummary;
}
