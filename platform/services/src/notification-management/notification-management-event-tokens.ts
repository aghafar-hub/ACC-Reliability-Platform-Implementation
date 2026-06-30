// platform/services/src/notification-management/notification-management-event-tokens.ts
// Typed EventToken constants for the Notification Management domain.

import { EventToken } from '@acc-reliability/kernel';

import type {
  NotificationRuleCreatedPayload,
  NotificationRuleUpdatedPayload,
  NotificationRuleEnabledPayload,
  NotificationRuleDisabledPayload,
  NotificationRuleArchivedPayload,
  NotificationRuleRestoredPayload,
} from '../contracts/platform-events';

export const NOTIFICATION_RULE_CREATED_TOKEN =
  new EventToken<NotificationRuleCreatedPayload>('platform.notification-management.rule.created');

export const NOTIFICATION_RULE_UPDATED_TOKEN =
  new EventToken<NotificationRuleUpdatedPayload>('platform.notification-management.rule.updated');

export const NOTIFICATION_RULE_ENABLED_TOKEN =
  new EventToken<NotificationRuleEnabledPayload>('platform.notification-management.rule.enabled');

export const NOTIFICATION_RULE_DISABLED_TOKEN =
  new EventToken<NotificationRuleDisabledPayload>('platform.notification-management.rule.disabled');

export const NOTIFICATION_RULE_ARCHIVED_TOKEN =
  new EventToken<NotificationRuleArchivedPayload>('platform.notification-management.rule.archived');

export const NOTIFICATION_RULE_RESTORED_TOKEN =
  new EventToken<NotificationRuleRestoredPayload>('platform.notification-management.rule.restored');
