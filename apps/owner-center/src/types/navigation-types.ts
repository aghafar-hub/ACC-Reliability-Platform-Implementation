// apps/owner-center/src/types/navigation-types.ts
// Route and module metadata types for the navigation framework.
//
// NAV_ITEMS is the single source of truth for shell routes. Both the sidebar
// and the breadcrumb derive their labels from this array — no duplication.

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Metadata for a top-level shell route.
 * `badge` drives visual indicators on the nav item (e.g. notification dot).
 * `moduleId` links the route to a platform module for future permission filtering.
 */
export interface RouteMetadata {
  readonly path: string;
  readonly icon: string;
  readonly label: { readonly en: string; readonly ar: string };
  readonly end?: boolean;
  readonly moduleId?: string;
  readonly badge?: 'notification';
}

/**
 * A single item in a rendered breadcrumb trail.
 * `path` is omitted for the current (non-linked) segment.
 */
export interface BreadcrumbItem {
  readonly label: { readonly en: string; readonly ar: string };
  readonly path?: string;
}

// ── Navigation config ─────────────────────────────────────────────────────────

export const NAV_ITEMS: readonly RouteMetadata[] = [
  {
    path: '/',
    icon: 'H',
    label: { en: 'Home', ar: 'الرئيسية' },
    end: true,
  },
  {
    path: '/oil-lubrication',
    icon: 'OL',
    label: { en: 'Oil Lubrication', ar: 'تشحيم الزيت' },
    moduleId: 'oil-lubrication',
  },
  {
    path: '/notifications',
    icon: 'N',
    label: { en: 'Notifications', ar: 'الإشعارات' },
    badge: 'notification',
  },
  {
    path: '/learning',
    icon: 'LC',
    label: { en: 'Learning Center', ar: 'مركز التعلم' },
  },
  {
    path: '/settings',
    icon: 'S',
    label: { en: 'Settings', ar: 'الإعدادات' },
  },
];
