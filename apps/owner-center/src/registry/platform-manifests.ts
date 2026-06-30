// apps/owner-center/src/registry/platform-manifests.ts
// Owner Center platform module manifests.
//
// This file is the single source of truth for all modules available in the
// Owner Center shell.  Adding a new module requires only:
//   1. Appending a UIModuleManifest entry to PLATFORM_MODULE_MANIFESTS.
//   2. Creating the page component in src/pages/.
//
// No changes to AppRouter or AppLayout are ever needed.
//
// Design:
//   - Lazy components are created at module level (not inside render) so they
//     are stable across renders and code splitting works correctly.
//   - The array order determines sidebar navigation order.
//   - alwaysVisible entries bypass lifecycle and permission filtering.
//   - lifecycleKey maps to the Module Registry moduleKey when it differs
//     from the permission-system moduleId.
//
// Sprint 03 — Dynamic Module Platform.

import React from 'react';
import type { UIModuleManifest } from '../types/module-registry-types';

// ── Lazy page loaders ─────────────────────────────────────────────────────────
// Created at module level for stable references and correct code splitting.

const OilLubricationPage         = React.lazy(() => import('../pages/OilLubricationPage'));
const NotificationsPage          = React.lazy(() => import('../pages/NotificationsPage'));
const LearningCenterPage         = React.lazy(() => import('../pages/LearningCenterPage'));
const SettingsPage               = React.lazy(() => import('../pages/SettingsPage'));
const UsersRolesPage             = React.lazy(() => import('../pages/UsersRolesPage'));
const ContractorsPage            = React.lazy(() => import('../pages/ContractorsPage'));
const ModuleRegistryPage         = React.lazy(() => import('../pages/ModuleRegistryPage'));
const BrandingCenterPage         = React.lazy(() => import('../pages/BrandingCenterPage'));
const LocalizationCenterPage     = React.lazy(() => import('../pages/LocalizationCenterPage'));
const NotificationManagementPage = React.lazy(() => import('../pages/NotificationManagementPage'));
const WorkflowApprovalPage       = React.lazy(() => import('../pages/WorkflowApprovalPage'));
const ReportingAnalyticsPage     = React.lazy(() => import('../pages/ReportingAnalyticsPage'));
const AuditActivityPage          = React.lazy(() => import('../pages/AuditActivityPage'));
const SystemHealthPage           = React.lazy(() => import('../pages/SystemHealthPage'));
const PlatformSettingsPage       = React.lazy(() => import('../pages/PlatformSettingsPage'));

// ── Version constants ─────────────────────────────────────────────────────────

const PLATFORM_VERSION = '0.1.0';
const SDK_VERSION      = '0.1.0';
const MODULE_VERSION   = '1.0.0';

// ── Platform module manifests ─────────────────────────────────────────────────

/**
 * Ordered collection of all Owner Center module manifests.
 *
 * The platform shell reads this array at startup to:
 *  - Register dynamic routes in AppRouter.
 *  - Generate sidebar navigation items in AppLayout.
 *  - Register health checks for enabled modules.
 *  - Expose settings for modules that declare hasSettings.
 *
 * Sidebar order follows array order.
 *
 * To add a new business module:
 *  1. Create a lazy component: `const MyPage = React.lazy(() => import('../pages/MyPage'))`.
 *  2. Append a `UIModuleManifest` entry to this array.
 *  3. Ensure the corresponding `moduleKey` is seeded in `bootstrap.ts`.
 */
export const PLATFORM_MODULE_MANIFESTS: readonly UIModuleManifest[] = Object.freeze([

  // ── 1. Home ────────────────────────────────────────────────────────────────
  // Always-visible platform sentinel — WelcomeDashboard is the index route
  // and is wired directly in AppRouter (not via a lazy component here).
  {
    moduleId:                'platform.home',
    displayName:             'Home',
    version:                 MODULE_VERSION,
    requiredPlatformVersion: PLATFORM_VERSION,
    requiredSdkVersion:      SDK_VERSION,
    icon:                    'home',
    category:                'Platform',
    routePath:               '/',
    navigationLabel:         { en: 'Home', ar: 'الرئيسية' },
    alwaysVisible:           true,
    navigationEnd:           true,
    // No component — index route handled by AppRouter with WelcomeDashboard.
  },

  // ── 2. Oil Lubrication ─────────────────────────────────────────────────────
  {
    moduleId:                'oil-lubrication',
    displayName:             'Oil Lubrication',
    version:                 MODULE_VERSION,
    requiredPlatformVersion: PLATFORM_VERSION,
    requiredSdkVersion:      SDK_VERSION,
    description:             'Oil change record management and lubrication point tracking.',
    icon:                    'droplet',
    category:                'Operations',
    routePath:               '/oil-lubrication',
    navigationLabel:         { en: 'Oil Lubrication', ar: 'تشحيم الزيت' },
    adminOnly:               false,
    hasHealthCheck:          true,
    lifecycleKey:            'oil-lubrication',
    component:               OilLubricationPage,
  },

  // ── 3. Notifications ───────────────────────────────────────────────────────
  {
    moduleId:                'platform.notifications',
    displayName:             'Notifications',
    version:                 MODULE_VERSION,
    requiredPlatformVersion: PLATFORM_VERSION,
    requiredSdkVersion:      SDK_VERSION,
    icon:                    'bell',
    category:                'Platform',
    routePath:               '/notifications',
    navigationLabel:         { en: 'Notifications', ar: 'الإشعارات' },
    navigationBadge:         'notification',
    alwaysVisible:           true,
    component:               NotificationsPage,
  },

  // ── 4. Learning Center ─────────────────────────────────────────────────────
  {
    moduleId:                'platform.learning',
    displayName:             'Learning Center',
    version:                 MODULE_VERSION,
    requiredPlatformVersion: PLATFORM_VERSION,
    requiredSdkVersion:      SDK_VERSION,
    icon:                    'book-open',
    category:                'Platform',
    routePath:               '/learning',
    navigationLabel:         { en: 'Learning Center', ar: 'مركز التعلم' },
    alwaysVisible:           true,
    component:               LearningCenterPage,
  },

  // ── 5. Users & Roles ───────────────────────────────────────────────────────
  // lifecycleKey maps permission moduleId → Module Registry moduleKey
  {
    moduleId:                'users-roles',
    displayName:             'Users & Roles',
    version:                 MODULE_VERSION,
    requiredPlatformVersion: PLATFORM_VERSION,
    requiredSdkVersion:      SDK_VERSION,
    description:             'User account management, role assignments, and access control.',
    icon:                    'users',
    category:                'Core',
    routePath:               '/users-roles',
    navigationLabel:         { en: 'Users & Roles', ar: 'المستخدمون والأدوار' },
    adminOnly:               true,
    hasHealthCheck:          true,
    lifecycleKey:            'user-management',
    component:               UsersRolesPage,
  },

  // ── 6. Contractors ─────────────────────────────────────────────────────────
  {
    moduleId:                'contractors',
    displayName:             'Contractors',
    version:                 MODULE_VERSION,
    requiredPlatformVersion: PLATFORM_VERSION,
    requiredSdkVersion:      SDK_VERSION,
    description:             'Contractor organization management and scoping.',
    icon:                    'briefcase',
    category:                'Core',
    routePath:               '/contractors',
    navigationLabel:         { en: 'Contractors', ar: 'المقاولون' },
    adminOnly:               true,
    hasHealthCheck:          true,
    lifecycleKey:            'contractor-management',
    component:               ContractorsPage,
  },

  // ── 7. Module Registry ─────────────────────────────────────────────────────
  {
    moduleId:                'module-registry',
    displayName:             'Module Registry',
    version:                 MODULE_VERSION,
    requiredPlatformVersion: PLATFORM_VERSION,
    requiredSdkVersion:      SDK_VERSION,
    description:             'Platform module catalog and lifecycle management.',
    icon:                    'package',
    category:                'Core',
    routePath:               '/module-registry',
    navigationLabel:         { en: 'Module Registry', ar: 'سجل الوحدات' },
    adminOnly:               true,
    hasHealthCheck:          true,
    lifecycleKey:            'module-registry',
    component:               ModuleRegistryPage,
  },

  // ── 8. Branding Center ─────────────────────────────────────────────────────
  {
    moduleId:                'branding',
    displayName:             'Branding Center',
    version:                 MODULE_VERSION,
    requiredPlatformVersion: PLATFORM_VERSION,
    requiredSdkVersion:      SDK_VERSION,
    description:             'ACC and contractor brand management.',
    icon:                    'tag',
    category:                'Platform',
    routePath:               '/branding',
    navigationLabel:         { en: 'Branding Center', ar: 'مركز العلامة التجارية' },
    adminOnly:               true,
    lifecycleKey:            'branding',
    component:               BrandingCenterPage,
  },

  // ── 9. Localization Center ─────────────────────────────────────────────────
  {
    moduleId:                'localization',
    displayName:             'Localization Center',
    version:                 MODULE_VERSION,
    requiredPlatformVersion: PLATFORM_VERSION,
    requiredSdkVersion:      SDK_VERSION,
    description:             'Platform language management and translation configuration.',
    icon:                    'globe',
    category:                'Platform',
    routePath:               '/localization',
    navigationLabel:         { en: 'Localization Center', ar: 'مركز التوطين' },
    adminOnly:               true,
    lifecycleKey:            'localization',
    component:               LocalizationCenterPage,
  },

  // ── 10. Notification Management ────────────────────────────────────────────
  {
    moduleId:                'notification-management',
    displayName:             'Notification Management',
    version:                 MODULE_VERSION,
    requiredPlatformVersion: PLATFORM_VERSION,
    requiredSdkVersion:      SDK_VERSION,
    description:             'Notification channel and delivery rule management.',
    icon:                    'volume-2',
    category:                'Platform',
    routePath:               '/notification-management',
    navigationLabel:         { en: 'Notification Management', ar: 'إدارة الإشعارات' },
    adminOnly:               true,
    hasHealthCheck:          true,
    lifecycleKey:            'notification-management',
    component:               NotificationManagementPage,
  },

  // ── 11. Workflow & Approval ────────────────────────────────────────────────
  {
    moduleId:                'workflow-approval',
    displayName:             'Workflow & Approval',
    version:                 MODULE_VERSION,
    requiredPlatformVersion: PLATFORM_VERSION,
    requiredSdkVersion:      SDK_VERSION,
    description:             'Workflow definitions and approval lifecycle management.',
    icon:                    'git-merge',
    category:                'Platform',
    routePath:               '/workflow-approval',
    navigationLabel:         { en: 'Workflow & Approval', ar: 'سير العمل والموافقة' },
    adminOnly:               false,
    hasHealthCheck:          true,
    lifecycleKey:            'workflow-engine',
    component:               WorkflowApprovalPage,
  },

  // ── 12. Reporting & Analytics ──────────────────────────────────────────────
  {
    moduleId:                'reporting-analytics',
    displayName:             'Reporting & Analytics',
    version:                 MODULE_VERSION,
    requiredPlatformVersion: PLATFORM_VERSION,
    requiredSdkVersion:      SDK_VERSION,
    description:             'Report definitions, export profiles, and analytics dashboards.',
    icon:                    'bar-chart-2',
    category:                'Analytics',
    routePath:               '/reporting-analytics',
    navigationLabel:         { en: 'Reporting & Analytics', ar: 'التقارير والتحليلات' },
    adminOnly:               false,
    hasHealthCheck:          true,
    lifecycleKey:            'reporting-center',
    component:               ReportingAnalyticsPage,
  },

  // ── 13. Audit & Activity ───────────────────────────────────────────────────
  {
    moduleId:                'audit-activity',
    displayName:             'Audit & Activity',
    version:                 MODULE_VERSION,
    requiredPlatformVersion: PLATFORM_VERSION,
    requiredSdkVersion:      SDK_VERSION,
    description:             'Platform audit log, activity history, and compliance reporting.',
    icon:                    'clipboard',
    category:                'Platform',
    routePath:               '/audit-activity',
    navigationLabel:         { en: 'Audit & Activity', ar: 'التدقيق والنشاط' },
    adminOnly:               true,
    hasHealthCheck:          true,
    lifecycleKey:            'audit-service',
    component:               AuditActivityPage,
  },

  // ── 14. System Health ──────────────────────────────────────────────────────
  {
    moduleId:                'system-health',
    displayName:             'System Health',
    version:                 MODULE_VERSION,
    requiredPlatformVersion: PLATFORM_VERSION,
    requiredSdkVersion:      SDK_VERSION,
    description:             'Platform health monitoring, service readiness, and performance metrics.',
    icon:                    'activity',
    category:                'Platform',
    routePath:               '/system-health',
    navigationLabel:         { en: 'System Health', ar: 'صحة النظام' },
    adminOnly:               true,
    hasHealthCheck:          true,
    lifecycleKey:            'health-monitor',
    component:               SystemHealthPage,
  },

  // ── 15. Platform Settings ──────────────────────────────────────────────────
  {
    moduleId:                'platform-settings',
    displayName:             'Platform Settings',
    version:                 MODULE_VERSION,
    requiredPlatformVersion: PLATFORM_VERSION,
    requiredSdkVersion:      SDK_VERSION,
    description:             'Platform configuration center for the App Owner.',
    icon:                    'settings',
    category:                'Platform',
    routePath:               '/platform-settings',
    navigationLabel:         { en: 'Platform Settings', ar: 'إعدادات المنصة' },
    adminOnly:               true,
    hasSettings:             true,
    settingsCategory:        'Platform Configuration',
    lifecycleKey:            'platform-settings',
    component:               PlatformSettingsPage,
  },

  // ── 16. Settings ───────────────────────────────────────────────────────────
  {
    moduleId:                'platform.settings',
    displayName:             'Settings',
    version:                 MODULE_VERSION,
    requiredPlatformVersion: PLATFORM_VERSION,
    requiredSdkVersion:      SDK_VERSION,
    icon:                    'sliders',
    category:                'Platform',
    routePath:               '/settings',
    navigationLabel:         { en: 'Settings', ar: 'الإعدادات' },
    alwaysVisible:           true,
    component:               SettingsPage,
  },
]);
