// apps/owner-center/src/pages/SettingsPage.tsx
// Settings gateway page — platform preferences and Owner Control Center.
//
// The Owner Control Center section surfaces all admin-only management pages
// that were previously scattered across the sidebar.  Routes and permission
// guards are unchanged — this page simply provides a navigable index.

import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { NavIcon } from '../components/NavIcon';

// ── Types ─────────────────────────────────────────────────────────────────────

interface L10n { en: string; ar: string; }

interface OccEntry {
  readonly path: string;
  readonly icon: string;
  readonly title: L10n;
  readonly desc: L10n;
}

// ── Static copy ───────────────────────────────────────────────────────────────

const COPY = {
  pageTitle:   { en: 'Settings',                                          ar: 'الإعدادات'                               },
  pageDesc:    { en: 'Platform preferences and Owner Control Center.',    ar: 'تفضيلات المنصة ومركز التحكم للمالك.'     },
  occHeading:  { en: 'Owner Control Center',                              ar: 'مركز التحكم للمالك'                       },
  occDesc:     { en: 'Platform administration tools — accessible to App Owner roles only.', ar: 'أدوات إدارة المنصة — متاحة لأدوار مالك التطبيق فقط.' },
  prefHeading: { en: 'Preferences',                                       ar: 'التفضيلات'                                },
  prefDesc:    { en: 'User-level preferences will appear here in a future update.',         ar: 'ستظهر تفضيلات المستخدم هنا في تحديث مستقبلي.'        },
  comingSoon:  { en: 'Coming soon',                                       ar: 'قريباً'                                   },
} as const;

// ── Owner Control Center entries ──────────────────────────────────────────────

const OCC_ENTRIES: readonly OccEntry[] = [
  {
    path:  '/users-roles',
    icon:  'users',
    title: { en: 'Users & Roles',          ar: 'المستخدمون والأدوار'           },
    desc:  { en: 'Manage user accounts, role assignments, and access control.', ar: 'إدارة حسابات المستخدمين والأدوار والتحكم في الوصول.' },
  },
  {
    path:  '/contractors',
    icon:  'briefcase',
    title: { en: 'Contractors',            ar: 'المقاولون'                     },
    desc:  { en: 'Manage contractor organizations and access scoping.',         ar: 'إدارة منظمات المقاولين ونطاق الوصول.'               },
  },
  {
    path:  '/module-registry',
    icon:  'package',
    title: { en: 'Module Registry',        ar: 'سجل الوحدات'                   },
    desc:  { en: 'Manage the platform module catalog and lifecycle states.',    ar: 'إدارة كتالوج الوحدات ودورات حياتها.'                },
  },
  {
    path:  '/branding',
    icon:  'tag',
    title: { en: 'Branding Center',        ar: 'مركز العلامة التجارية'          },
    desc:  { en: 'Configure ACC and contractor logos and brand identity.',      ar: 'تهيئة شعارات وهوية العلامة التجارية.'               },
  },
  {
    path:  '/localization',
    icon:  'globe',
    title: { en: 'Localization Center',    ar: 'مركز التوطين'                   },
    desc:  { en: 'Manage platform languages and translation configuration.',    ar: 'إدارة لغات المنصة وتهيئة الترجمة.'                  },
  },
  {
    path:  '/notification-management',
    icon:  'volume-2',
    title: { en: 'Notification Management',ar: 'إدارة الإشعارات'                },
    desc:  { en: 'Configure notification channels and delivery rules.',         ar: 'تهيئة قنوات الإشعارات وقواعد التسليم.'              },
  },
  {
    path:  '/workflow-approval',
    icon:  'git-merge',
    title: { en: 'Workflow Configuration', ar: 'تهيئة سير العمل'                },
    desc:  { en: 'Define approval workflows and routing rules.',                ar: 'تحديد مسارات الموافقة وقواعد التوجيه.'              },
  },
  {
    path:  '/reporting-analytics',
    icon:  'bar-chart-2',
    title: { en: 'Reporting Configuration',ar: 'تهيئة التقارير'                 },
    desc:  { en: 'Manage report definitions and export profiles.',              ar: 'إدارة تعريفات التقارير وملفات التصدير.'              },
  },
  {
    path:  '/audit-activity',
    icon:  'clipboard',
    title: { en: 'Audit & Activity',       ar: 'التدقيق والنشاط'                },
    desc:  { en: 'Review platform audit logs, activity history, and compliance reports.', ar: 'مراجعة سجلات التدقيق وتاريخ النشاط وتقارير الامتثال.' },
  },
  {
    path:  '/system-health',
    icon:  'activity',
    title: { en: 'System Health',          ar: 'صحة النظام'                     },
    desc:  { en: 'Monitor service readiness, health probes, and platform diagnostics.', ar: 'مراقبة جاهزية الخدمات وتشخيصات المنصة.'          },
  },
  {
    path:  '/platform-settings',
    icon:  'settings',
    title: { en: 'Platform Settings',      ar: 'إعدادات المنصة'                 },
    desc:  { en: 'Configure global platform behavior and feature flags.',       ar: 'ضبط سلوك المنصة العام وأعلام الميزات.'              },
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function OccCard({ entry, locale }: { entry: OccEntry; locale: string }): React.ReactElement {
  const isAr = locale === 'ar';
  return (
    <Link to={entry.path} className="settings-occ-card">
      <span className="settings-occ-card__icon">
        <NavIcon id={entry.icon} />
      </span>
      <span className="settings-occ-card__body">
        <span className="settings-occ-card__title">
          {isAr ? entry.title.ar : entry.title.en}
        </span>
        <span className="settings-occ-card__desc">
          {isAr ? entry.desc.ar : entry.desc.en}
        </span>
      </span>
    </Link>
  );
}

// ── SettingsPage ──────────────────────────────────────────────────────────────

export default function SettingsPage(): React.ReactElement {
  const { locale } = useLanguage();
  const isAr = locale === 'ar';
  const t = (bundle: L10n) => (isAr ? bundle.ar : bundle.en);

  return (
    <div className="settings-page">

      {/* ── Page header ── */}
      <div className="settings-page__header">
        <div className="settings-page__header-text">
          <h1 className="settings-page__title">{t(COPY.pageTitle)}</h1>
          <p className="settings-page__desc">{t(COPY.pageDesc)}</p>
        </div>
      </div>

      {/* ── Owner Control Center ── */}
      <section className="settings-section">
        <div className="settings-section__head">
          <h2 className="settings-section__title">{t(COPY.occHeading)}</h2>
          <p className="settings-section__desc">{t(COPY.occDesc)}</p>
        </div>
        <div className="settings-occ-grid">
          {OCC_ENTRIES.map((entry) => (
            <OccCard key={entry.path} entry={entry} locale={locale} />
          ))}
        </div>
      </section>

      {/* ── User Preferences (future) ── */}
      <section className="settings-section">
        <div className="settings-section__head">
          <h2 className="settings-section__title">{t(COPY.prefHeading)}</h2>
          <p className="settings-section__desc">{t(COPY.prefDesc)}</p>
        </div>
        <div className="settings-pref-placeholder">
          <span className="placeholder-page__status">{t(COPY.comingSoon)}</span>
        </div>
      </section>

    </div>
  );
}
