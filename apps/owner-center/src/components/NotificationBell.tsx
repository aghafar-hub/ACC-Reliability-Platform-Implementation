// apps/owner-center/src/components/NotificationBell.tsx
// Header notification bell — opens a recent-notifications dropdown.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getRecentNotifications,
  getUnreadNotificationCount,
} from '../hooks/useNotifications';
import type { NotificationItem } from '../types/notification-types';
import type { LocaleCode } from '../types/app-types';

// ── Props ─────────────────────────────────────────────────────────────────────

interface NotificationBellProps {
  readonly locale: LocaleCode;
}

// ── Copy ──────────────────────────────────────────────────────────────────────

const COPY = {
  ariaLabel:     { en: 'Notifications',           ar: 'الإشعارات'              },
  unreadSuffix:  { en: 'unread',                    ar: 'غير مقروء'              },
  panelTitle:    { en: 'Recent Notifications',      ar: 'الإشعارات الأخيرة'      },
  viewAll:       { en: 'View all notifications',    ar: 'عرض جميع الإشعارات'     },
  empty:         { en: 'No notifications.',         ar: 'لا توجد إشعارات.'       },
  today:         { en: 'Today',                     ar: 'اليوم'                  },
  yesterday:     { en: 'Yesterday',                 ar: 'أمس'                    },
} as const;

const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

// ── Helpers ───────────────────────────────────────────────────────────────────

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

/** Maps a notification to its related module page. */
function resolveNotificationHref(item: NotificationItem): string {
  const title = item.title.en.toLowerCase();

  if (item.category === 'approval' || title.includes('approval')) {
    return '/workflow-approval';
  }
  if (item.category === 'maintenance' || title.includes('maintenance')) {
    return item.moduleId ? `/${item.moduleId}` : '/oil-lubrication';
  }
  if (title.includes('platform ready')) {
    return '/system-health';
  }
  if (title.includes('module updated')) {
    return '/module-registry';
  }
  if (item.moduleId) {
    return `/${item.moduleId}`;
  }
  return '/notifications';
}

// ── NotificationBell ──────────────────────────────────────────────────────────

export function NotificationBell({ locale }: NotificationBellProps): React.ReactElement {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isAr = locale === 'ar';

  const unreadCount = useMemo(() => getUnreadNotificationCount(), []);
  const recentNotifications = useMemo(() => getRecentNotifications(5), []);

  const ariaLabel = isAr
    ? `${COPY.ariaLabel.ar}: ${unreadCount} ${COPY.unreadSuffix.ar}`
    : `${COPY.ariaLabel.en}: ${unreadCount} ${COPY.unreadSuffix.en}`;

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent): void {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  function handleNotificationClick(item: NotificationItem): void {
    setOpen(false);
    navigate(resolveNotificationHref(item));
  }

  return (
    <div
      ref={rootRef}
      className={`notif-bell-wrap${open ? ' notif-bell-wrap--open' : ''}`}
    >
      <button
        type="button"
        className="notif-bell"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="notif-bell__icon" aria-hidden="true">&#128276;</span>
        {unreadCount > 0 && (
          <span className="notif-bell__badge" aria-hidden="true">{unreadCount}</span>
        )}
      </button>

      {open && (
        <div
          className="notif-bell__dropdown"
          role="menu"
          aria-label={isAr ? COPY.panelTitle.ar : COPY.panelTitle.en}
        >
          <div className="notif-bell__dropdown-header">
            <span className="notif-bell__dropdown-title">
              {isAr ? COPY.panelTitle.ar : COPY.panelTitle.en}
            </span>
            {unreadCount > 0 && (
              <span className="notif-bell__dropdown-count">{unreadCount}</span>
            )}
          </div>

          <div className="notif-bell__dropdown-list" role="none">
            {recentNotifications.length === 0 ? (
              <p className="notif-bell__dropdown-empty">
                {isAr ? COPY.empty.ar : COPY.empty.en}
              </p>
            ) : (
              recentNotifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  className={`notif-bell__item${item.status === 'unread' ? ' notif-bell__item--unread' : ''}`}
                  onClick={() => handleNotificationClick(item)}
                >
                  <span
                    className="notif-bell__item-dot"
                    data-priority={item.priority}
                    aria-hidden="true"
                  />
                  <span className="notif-bell__item-body">
                    <span className="notif-bell__item-title">
                      {isAr ? item.title.ar : item.title.en}
                    </span>
                    <span className="notif-bell__item-text">
                      {isAr ? item.body.ar : item.body.en}
                    </span>
                    <time
                      className="notif-bell__item-time"
                      dateTime={item.timestamp.toISOString()}
                    >
                      {formatTimestamp(item.timestamp, locale)}
                    </time>
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="notif-bell__dropdown-footer">
            <Link
              to="/notifications"
              className="notif-bell__view-all"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              {isAr ? COPY.viewAll.ar : COPY.viewAll.en}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
