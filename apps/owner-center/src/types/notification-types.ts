// apps/owner-center/src/types/notification-types.ts
// Notification Center type definitions.
//
// NotificationCategory is the module extension point: future modules declare
// their own category strings and register NotificationItem producers.
// No API calls, no push subscription — those come in a later milestone.

// ── Primitives ────────────────────────────────────────────────────────────────

/** Source domain of a notification. Future modules add their own categories. */
export type NotificationCategory = 'system' | 'maintenance' | 'approval' | 'alert';

/** Urgency level — drives visual priority indicators. */
export type NotificationPriority = 'high' | 'medium' | 'low';

/** Read/unread lifecycle state. */
export type NotificationStatus = 'unread' | 'read';

/**
 * Delivery channel.  Only `in-app` is active now.
 * `push` and `email` are defined for future integration.
 */
export type NotificationChannel = 'in-app' | 'push' | 'email';

/** Active filter key for the Notification Center filter bar. */
export type NotificationFilter = 'all' | 'unread' | 'high-priority' | 'approvals';

// ── Core type ─────────────────────────────────────────────────────────────────

/**
 * A single notification item.
 * `moduleId` is set by the module that produced the notification, enabling
 * future per-module filtering and routing.
 */
export interface NotificationItem {
  readonly id: string;
  readonly category: NotificationCategory;
  readonly priority: NotificationPriority;
  readonly status: NotificationStatus;
  readonly channel: NotificationChannel;
  readonly title: { readonly en: string; readonly ar: string };
  readonly body: { readonly en: string; readonly ar: string };
  readonly timestamp: Date;
  readonly moduleId?: string;
}
