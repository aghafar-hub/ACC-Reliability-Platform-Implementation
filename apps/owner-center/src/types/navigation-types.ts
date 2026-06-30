// apps/owner-center/src/types/navigation-types.ts
// Route and module metadata types for the navigation framework.
//
// NAV_ITEMS is the single source of truth for shell routes. Both the sidebar
// and the breadcrumb derive their labels from this array — no duplication.

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Metadata for a top-level shell route.
 *
 * `moduleId`   — links the route to a platform module; enables permission filtering.
 * `adminOnly`  — when true the route requires `contractorScope:'all'` access, which
 *                only `AppOwner` users can satisfy.  Use for platform-administration
 *                pages.  Ignored when `moduleId` is absent.
 * `badge`      — drives visual indicators on the nav item (e.g. notification dot).
 */
export interface RouteMetadata {
  readonly path: string;
  readonly icon: string;
  readonly label: { readonly en: string; readonly ar: string };
  readonly end?: boolean;
  readonly moduleId?: string;
  readonly adminOnly?: boolean;
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
    icon: 'home',
    label: { en: 'Home', ar: 'الرئيسية' },
    end: true,
  },
  {
    path: '/oil-lubrication',
    icon: 'droplet',
    label: { en: 'Oil Lubrication', ar: 'تشحيم الزيت' },
    moduleId: 'oil-lubrication',
  },
  {
    path: '/notifications',
    icon: 'bell',
    label: { en: 'Notifications', ar: 'الإشعارات' },
    badge: 'notification',
  },
  {
    path: '/learning',
    icon: 'book-open',
    label: { en: 'Learning Center', ar: 'مركز التعلم' },
  },
  {
    path: '/users-roles',
    icon: 'users',
    label: { en: 'Users & Roles', ar: 'المستخدمون والأدوار' },
    moduleId: 'users-roles',
    adminOnly: true,
  },
  {
    path: '/contractors',
    icon: 'briefcase',
    label: { en: 'Contractors', ar: 'المقاولون' },
    moduleId: 'contractors',
    adminOnly: true,
  },
  {
    path: '/module-registry',
    icon: 'package',
    label: { en: 'Module Registry', ar: 'سجل الوحدات' },
    moduleId: 'module-registry',
    adminOnly: true,
  },
  {
    path: '/branding',
    icon: 'tag',
    label: { en: 'Branding Center', ar: 'مركز العلامة التجارية' },
    moduleId: 'branding',
    adminOnly: true,
  },
  {
    path: '/localization',
    icon: 'globe',
    label: { en: 'Localization Center', ar: 'مركز التوطين' },
    moduleId: 'localization',
    adminOnly: true,
  },
  {
    path: '/notification-management',
    icon: 'volume-2',
    label: { en: 'Notification Management', ar: 'إدارة الإشعارات' },
    moduleId: 'notification-management',
    adminOnly: true,
  },
  {
    path: '/workflow-approval',
    icon: 'git-merge',
    label: { en: 'Workflow & Approval', ar: 'سير العمل والموافقة' },
    moduleId: 'workflow-approval',
  },
  {
    path: '/reporting-analytics',
    icon: 'bar-chart-2',
    label: { en: 'Reporting & Analytics', ar: 'التقارير والتحليلات' },
    moduleId: 'reporting-analytics',
  },
  {
    path: '/audit-activity',
    icon: 'clipboard',
    label: { en: 'Audit & Activity', ar: 'التدقيق والنشاط' },
    moduleId: 'audit-activity',
    adminOnly: true,
  },
  {
    path: '/system-health',
    icon: 'activity',
    label: { en: 'System Health', ar: 'صحة النظام' },
    moduleId: 'system-health',
    adminOnly: true,
  },
  {
    path: '/platform-settings',
    icon: 'settings',
    label: { en: 'Platform Settings', ar: 'إعدادات المنصة' },
    moduleId: 'platform-settings',
    adminOnly: true,
  },
  {
    path: '/settings',
    icon: 'sliders',
    label: { en: 'Settings', ar: 'الإعدادات' },
  },
];
