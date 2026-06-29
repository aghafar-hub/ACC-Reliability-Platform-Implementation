// apps/owner-center/src/pages/NotificationsPage.tsx
// Notification Center page — filter bar + static placeholder notification list.
// No API calls, no backend, no push subscription.

import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useNotifications } from '../hooks/useNotifications';
import type { NotificationFilter, NotificationItem, NotificationPriority, NotificationCategory } from '../types/notification-types';
import type { LocaleCode } from '../types/app-types';

// ── Copy ──────────────────────────────────────────────────────────────────────

const COPY = {
  pageTitle:    { en: 'Notifications',    ar: 'الإشعارات'       },
  unreadSuffix: { en: 'unread',           ar: 'غير مقروء'        },
  filters: {
    all:           { en: 'All',           ar: 'الكل'             },
    unread:        { en: 'Unread',        ar: 'غير المقروءة'      },
    'high-priority': { en: 'High Priority', ar: 'أولوية عالية'   },
    approvals:     { en: 'Approvals',     ar: 'الموافقات'         },
  },
  category: {
    system:      { en: 'System',      ar: 'النظام'    },
    maintenance: { en: 'Maintenance', ar: 'الصيانة'   },
    approval:    { en: 'Approval',    ar: 'الموافقة'  },
    alert:       { en: 'Alert',       ar: 'تنبيه'     },
  },
  priority: {
    high:   { en: 'High',   ar: 'عالية'  },
    medium: { en: 'Medium', ar: 'متوسطة' },
    low:    { en: 'Low',    ar: 'منخفضة' },
  },
  empty: {
    all:             { en: 'No notifications.',              ar: 'لا توجد إشعارات.'                   },
    unread:          { en: 'No unread notifications.',       ar: 'لا توجد إشعارات غير مقروءة.'        },
    'high-priority': { en: 'No high priority notifications.', ar: 'لا توجد إشعارات عالية الأولوية.'   },
    approvals:       { en: 'No approval notifications.',     ar: 'لا توجد إشعارات موافقة.'            },
  },
  today:     { en: 'Today',     ar: 'اليوم'  },
  yesterday: { en: 'Yesterday', ar: 'أمس'    },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function formatTimestamp(date: Date, locale: LocaleCode): string {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
  const itemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (itemDay.getTime() === todayStart.getTime()) {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const prefix = locale === 'ar' ? COPY.today.ar : COPY.today.en;
    return `${prefix} ${h}:${m}`;
  }
  if (itemDay.getTime() === yesterdayStart.getTime()) {
    return locale === 'ar' ? COPY.yesterday.ar : COPY.yesterday.en;
  }
  const months = locale === 'ar' ? MONTHS_AR : MONTHS_EN;
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

// ── Filter tab bar ────────────────────────────────────────────────────────────

const FILTER_KEYS: readonly NotificationFilter[] = ['all', 'unread', 'high-priority', 'approvals'];

interface FilterBarProps {
  readonly activeFilter: NotificationFilter;
  readonly onFilterChange: (f: NotificationFilter) => void;
  readonly locale: LocaleCode;
}

function FilterBar({ activeFilter, onFilterChange, locale }: FilterBarProps): React.ReactElement {
  const isAr = locale === 'ar';

  return (
    <div className="notif-filters" role="tablist" aria-label={isAr ? 'تصفية الإشعارات' : 'Filter notifications'}>
      {FILTER_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={activeFilter === key}
          className={`notif-filter-btn${activeFilter === key ? ' notif-filter-btn--active' : ''}`}
          onClick={() => { onFilterChange(key); }}
        >
          {isAr ? COPY.filters[key].ar : COPY.filters[key].en}
        </button>
      ))}
    </div>
  );
}

// ── Notification item ─────────────────────────────────────────────────────────

interface NotifItemProps {
  readonly item: NotificationItem;
  readonly locale: LocaleCode;
}

function NotifItem({ item, locale }: NotifItemProps): React.ReactElement {
  const isAr = locale === 'ar';

  return (
    <article
      className={`notif-item${item.status === 'unread' ? ' notif-item--unread' : ''}`}
      aria-label={isAr ? item.title.ar : item.title.en}
    >
      <div className="notif-item__priority-dot" data-priority={item.priority} aria-hidden="true" />

      <div className="notif-item__body">
        <p className="notif-item__title">
          {isAr ? item.title.ar : item.title.en}
        </p>
        <p className="notif-item__text">
          {isAr ? item.body.ar : item.body.en}
        </p>
        <div className="notif-item__meta">
          <span className={`notif-category-chip notif-category-chip--${item.category}`}>
            {isAr
              ? COPY.category[item.category as NotificationCategory].ar
              : COPY.category[item.category as NotificationCategory].en}
          </span>
          <span className={`notif-priority-chip notif-priority-chip--${item.priority}`}>
            {isAr
              ? COPY.priority[item.priority as NotificationPriority].ar
              : COPY.priority[item.priority as NotificationPriority].en}
          </span>
          <time className="notif-item__time" dateTime={item.timestamp.toISOString()}>
            {formatTimestamp(item.timestamp, locale)}
          </time>
        </div>
      </div>
    </article>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NotificationsPage(): React.ReactElement {
  const { locale } = useLanguage();
  const { notifications, filter, setFilter, unreadCount } = useNotifications();
  const isAr = locale === 'ar';

  return (
    <div className="notif-center">
      {/* Page header */}
      <div className="notif-center__header">
        <h1 className="notif-center__title">
          {isAr ? COPY.pageTitle.ar : COPY.pageTitle.en}
        </h1>
        {unreadCount > 0 && (
          <span className="notif-center__unread-badge" aria-label={
            isAr
              ? `${unreadCount} ${COPY.unreadSuffix.ar}`
              : `${unreadCount} ${COPY.unreadSuffix.en}`
          }>
            {unreadCount}
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <FilterBar
        activeFilter={filter}
        onFilterChange={setFilter}
        locale={locale}
      />

      {/* Notification list */}
      <div className="notif-list" role="list" aria-live="polite">
        {notifications.length === 0 ? (
          <p className="notif-empty">
            {isAr ? COPY.empty[filter].ar : COPY.empty[filter].en}
          </p>
        ) : (
          notifications.map((item) => (
            <NotifItem key={item.id} item={item} locale={locale} />
          ))
        )}
      </div>
    </div>
  );
}
