// apps/owner-center/src/hooks/useNotifications.ts
// Notification Center state — static placeholder data + filter logic.
//
// Called only inside NotificationsPage.  Never imported in AppLayout or
// called at startup.  No API calls, no backend, no push subscription.

import { useState, useMemo } from 'react';
import type {
  NotificationItem,
  NotificationFilter,
} from '../types/notification-types';

// ── Static placeholder notifications ─────────────────────────────────────────
// Covers all four categories and all three priorities so every filter tab
// returns at least one result during manual verification.

const PLACEHOLDER_NOTIFICATIONS: readonly NotificationItem[] = [
  {
    id: 'notif-001',
    category: 'approval',
    priority: 'high',
    status: 'unread',
    channel: 'in-app',
    title: { en: 'Approval Required',                          ar: 'مطلوب موافقة'                           },
    body:  { en: 'Work order #WO-2026-042 awaiting approval.', ar: 'أمر العمل #WO-2026-042 في انتظار موافقتك.' },
    timestamp: new Date('2026-06-29T07:15:00Z'),
    moduleId: 'oil-lubrication',
  },
  {
    id: 'notif-002',
    category: 'system',
    priority: 'high',
    status: 'unread',
    channel: 'in-app',
    title: { en: 'Platform Ready',                               ar: 'المنصة جاهزة'                         },
    body:  { en: 'ACC Reliability Platform is now operational.', ar: 'منصة موثوقية ACC جاهزة للاستخدام.'     },
    timestamp: new Date('2026-06-29T08:00:00Z'),
  },
  {
    id: 'notif-003',
    category: 'maintenance',
    priority: 'medium',
    status: 'unread',
    channel: 'in-app',
    title: { en: 'Maintenance Due',                         ar: 'موعد الصيانة'                        },
    body:  { en: 'Oil lubrication check due in 7 days.',   ar: 'موعد فحص تشحيم الزيت خلال 7 أيام.'   },
    timestamp: new Date('2026-06-28T10:30:00Z'),
    moduleId: 'oil-lubrication',
  },
  {
    id: 'notif-004',
    category: 'system',
    priority: 'low',
    status: 'read',
    channel: 'in-app',
    title: { en: 'Module Updated',                          ar: 'تم تحديث الوحدة'                     },
    body:  { en: 'Oil Lubrication module updated to v1.0.', ar: 'تم تحديث وحدة تشحيم الزيت إلى 1.0.'  },
    timestamp: new Date('2026-06-27T14:00:00Z'),
    moduleId: 'oil-lubrication',
  },
  {
    id: 'notif-005',
    category: 'maintenance',
    priority: 'medium',
    status: 'read',
    channel: 'in-app',
    title: { en: 'Inspection Complete',                              ar: 'اكتمل الفحص'                              },
    body:  { en: 'Monthly equipment inspection marked complete.',    ar: 'تم وضع علامة اكتمال على الفحص الشهري.'   },
    timestamp: new Date('2026-06-26T09:00:00Z'),
  },
];

// ── Hook public surface ───────────────────────────────────────────────────────

export interface NotificationsState {
  readonly notifications: readonly NotificationItem[];
  readonly filter: NotificationFilter;
  readonly setFilter: (f: NotificationFilter) => void;
  readonly unreadCount: number;
}

export function useNotifications(): NotificationsState {
  const [filter, setFilter] = useState<NotificationFilter>('all');

  const notifications = useMemo((): readonly NotificationItem[] => {
    switch (filter) {
      case 'unread':
        return PLACEHOLDER_NOTIFICATIONS.filter((n) => n.status === 'unread');
      case 'high-priority':
        return PLACEHOLDER_NOTIFICATIONS.filter((n) => n.priority === 'high');
      case 'approvals':
        return PLACEHOLDER_NOTIFICATIONS.filter((n) => n.category === 'approval');
      default:
        return PLACEHOLDER_NOTIFICATIONS;
    }
  }, [filter]);

  const unreadCount = useMemo(
    () => PLACEHOLDER_NOTIFICATIONS.filter((n) => n.status === 'unread').length,
    [],
  );

  return { notifications, filter, setFilter, unreadCount };
}
