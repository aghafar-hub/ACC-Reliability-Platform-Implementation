// apps/owner-center/src/pages/WelcomeDashboard.tsx
// Owner Center home page — enterprise command center dashboard.
//
// Fully static: no API calls, no auth changes. All data is placeholder.
// All copy is bilingual (EN/AR). Locale consumed from existing context.

import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { NavIcon } from '../components/NavIcon';
import { StatusChip } from '../components/StatusChip';

// ── Locale helpers ────────────────────────────────────────────────────────────

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type StatusVariant = 'operational' | 'warning' | 'critical' | 'maintenance';

interface KpiCard {
  readonly label:   L10n<string>;
  readonly value:   L10n<string>;
  readonly subtext: L10n<string>;
  readonly variant: StatusVariant;
}

interface ReadinessCard {
  readonly name:        L10n<string>;
  readonly desc:        L10n<string>;
  readonly status:      StatusVariant;
  readonly statusLabel: L10n<string>;
}

interface ActionCard {
  readonly title:  L10n<string>;
  readonly desc:   L10n<string>;
  readonly to:     string;
  readonly iconId: string;
}

// ── Static copy ───────────────────────────────────────────────────────────────

const COPY = {
  title:         { en: 'ACC Owner Center',           ar: 'مركز المالك - ACC' },
  subtitle:      { en: 'Platform Command Center',    ar: 'مركز قيادة المنصة' },
  lastUpdated:   { en: 'Last updated: just now',     ar: 'آخر تحديث: الآن' },

  secSummary:    { en: 'Summary',                    ar: 'الملخص' },
  secReadiness:  { en: 'Platform Readiness',         ar: 'جاهزية المنصة' },
  secProgress:   { en: 'Owner Center Progress',      ar: 'تقدم مركز المالك' },
  secActions:    { en: 'Quick Actions',               ar: 'إجراءات سريعة' },
  secActivity:   { en: 'Recent Activity',            ar: 'النشاط الأخير' },
  secAlerts:     { en: 'System Alerts',              ar: 'تنبيهات النظام' },

  progressText:  { en: '13 of 15 modules registered', ar: '١٣ من ١٥ وحدة مسجلة' },
  progressPct:   { en: '87%',                        ar: '٨٧٪' },
  viewModules:   { en: 'View Module Registry',       ar: 'عرض سجل الوحدات' },

  noActivity:    { en: 'No recent activity to display.', ar: 'لا يوجد نشاط حديث للعرض.' },
  noAlerts:      { en: 'No active system alerts.',       ar: 'لا توجد تنبيهات نظام نشطة.' },

  allSystemsNormal: { en: 'All systems normal', ar: 'جميع الأنظمة تعمل بشكل طبيعي' },
} as const;

// ── Static data ───────────────────────────────────────────────────────────────

const KPI_CARDS: readonly KpiCard[] = [
  {
    label:   { en: 'Platform Health',    ar: 'صحة المنصة' },
    value:   { en: 'Operational',        ar: 'تشغيلي' },
    subtext: { en: 'All systems normal', ar: 'جميع الأنظمة طبيعية' },
    variant: 'operational',
  },
  {
    label:   { en: 'Pending Approvals',  ar: 'الموافقات المعلقة' },
    value:   { en: '3',                  ar: '٣' },
    subtext: { en: 'Awaiting review',    ar: 'في انتظار المراجعة' },
    variant: 'warning',
  },
  {
    label:   { en: 'Active Modules',     ar: 'الوحدات النشطة' },
    value:   { en: '13',                 ar: '١٣' },
    subtext: { en: 'of 15 registered',   ar: 'من ١٥ مسجلة' },
    variant: 'operational',
  },
  {
    label:   { en: 'Open Notifications', ar: 'الإشعارات المفتوحة' },
    value:   { en: '5',                  ar: '٥' },
    subtext: { en: '3 unread',           ar: '٣ غير مقروءة' },
    variant: 'operational',
  },
];

const READINESS_CARDS: readonly ReadinessCard[] = [
  {
    name:        { en: 'App Shell',              ar: 'غلاف التطبيق' },
    desc:        { en: 'Layout, routing and context providers fully initialised.', ar: 'تم تهيئة التخطيط والتوجيه ومزودو السياق بالكامل.' },
    status:      'operational',
    statusLabel: { en: 'Operational', ar: 'تشغيلي' },
  },
  {
    name:        { en: 'Platform SDK',           ar: 'SDK المنصة' },
    desc:        { en: 'Type contracts loaded. Service wiring pending backend integration.', ar: 'تم تحميل عقود الأنواع. ربط الخدمات معلق.' },
    status:      'operational',
    statusLabel: { en: 'Operational', ar: 'تشغيلي' },
  },
  {
    name:        { en: 'Authentication Layer',   ar: 'طبقة المصادقة' },
    desc:        { en: 'Auth placeholder active. Identity provider integration pending.', ar: 'العنصر النائب للمصادقة نشط. تكامل مزود الهوية معلق.' },
    status:      'maintenance',
    statusLabel: { en: 'Maintenance', ar: 'صيانة' },
  },
  {
    name:        { en: 'Oil Lubrication',        ar: 'تشحيم الزيت' },
    desc:        { en: 'Data model ready. UI workflow and backend endpoints pending.', ar: 'نموذج البيانات جاهز. سير العمل والنقاط الخلفية معلقة.' },
    status:      'operational',
    statusLabel: { en: 'Operational', ar: 'تشغيلي' },
  },
  {
    name:        { en: 'Notification Service',   ar: 'خدمة الإشعارات' },
    desc:        { en: 'Push config placeholder ready. Web Push service worker pending.', ar: 'الإعداد النائب جاهز. عامل خدمة Push الويب معلق.' },
    status:      'warning',
    statusLabel: { en: 'Warning', ar: 'تحذير' },
  },
  {
    name:        { en: 'Workflow Engine',        ar: 'محرك سير العمل' },
    desc:        { en: 'Approval flow types defined. Execution engine milestone pending.', ar: 'أنواع تدفق الموافقة محددة. معلم محرك التنفيذ معلق.' },
    status:      'maintenance',
    statusLabel: { en: 'Maintenance', ar: 'صيانة' },
  },
];

const ACTION_CARDS: readonly ActionCard[] = [
  {
    title:  { en: 'Users & Roles',      ar: 'المستخدمون والأدوار' },
    desc:   { en: 'Manage access and permissions', ar: 'إدارة الصلاحيات والوصول' },
    to:     '/users-roles',
    iconId: 'users',
  },
  {
    title:  { en: 'Contractors',        ar: 'المقاولون' },
    desc:   { en: 'Manage contractor profiles',    ar: 'إدارة ملفات المقاولين' },
    to:     '/contractors',
    iconId: 'briefcase',
  },
  {
    title:  { en: 'System Health',      ar: 'صحة النظام' },
    desc:   { en: 'Monitor platform diagnostics',  ar: 'مراقبة تشخيصات المنصة' },
    to:     '/system-health',
    iconId: 'activity',
  },
  {
    title:  { en: 'Platform Settings',  ar: 'إعدادات المنصة' },
    desc:   { en: 'Configure platform behaviour',  ar: 'ضبط إعدادات المنصة' },
    to:     '/platform-settings',
    iconId: 'settings',
  },
];

const MODULE_CHIPS: readonly L10n<string>[] = [
  { en: 'Oil Lubrication',         ar: 'تشحيم الزيت' },
  { en: 'Notifications',           ar: 'الإشعارات' },
  { en: 'Learning Center',         ar: 'مركز التعلم' },
  { en: 'Users & Roles',           ar: 'المستخدمون والأدوار' },
  { en: 'Contractors',             ar: 'المقاولون' },
  { en: 'Module Registry',         ar: 'سجل الوحدات' },
  { en: 'Branding Center',         ar: 'مركز العلامة التجارية' },
  { en: 'Localization Center',     ar: 'مركز التوطين' },
  { en: 'Notification Management', ar: 'إدارة الإشعارات' },
  { en: 'Workflow & Approval',     ar: 'سير العمل والموافقة' },
  { en: 'Reporting & Analytics',   ar: 'التقارير والتحليلات' },
  { en: 'Audit & Activity',        ar: 'التدقيق والنشاط' },
  { en: 'System Health',           ar: 'صحة النظام' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function DashboardSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="dashboard-section">
      <h2 className="dashboard-section__title">{heading}</h2>
      {children}
    </section>
  );
}

function StatusDot({ variant }: { variant: StatusVariant }): React.ReactElement {
  return <span className={`db-status-dot db-status-dot--${variant}`} aria-hidden="true" />;
}

function KpiCardItem({ card, locale }: { card: KpiCard; locale: string }): React.ReactElement {
  return (
    <div className={`db-kpi-card db-kpi-card--${card.variant}`}>
      <span className="db-kpi-card__label">{t(card.label, locale)}</span>
      <span className="db-kpi-card__value">{t(card.value, locale)}</span>
      <div className="db-kpi-card__status">
        <StatusDot variant={card.variant} />
        <span>{t(card.subtext, locale)}</span>
      </div>
    </div>
  );
}

function ReadinessCardItem({ card, locale }: { card: ReadinessCard; locale: string }): React.ReactElement {
  return (
    <div className="status-card">
      <div className="status-card__header">
        <span className="status-card__title">{t(card.name, locale)}</span>
        <StatusChip status={card.status} label={t(card.statusLabel, locale)} />
      </div>
      <p className="status-card__desc">{t(card.desc, locale)}</p>
    </div>
  );
}

function ActionCardItem({ card, locale }: { card: ActionCard; locale: string }): React.ReactElement {
  return (
    <Link to={card.to} className="db-action-card">
      <span className="db-action-card__icon">
        <NavIcon id={card.iconId} />
      </span>
      <span className="db-action-card__text">
        <span className="db-action-card__title">{t(card.title, locale)}</span>
        <span className="db-action-card__desc">{t(card.desc, locale)}</span>
      </span>
    </Link>
  );
}

function EmptyPanel({ message }: { message: string }): React.ReactElement {
  return <p className="db-panel__empty">{message}</p>;
}

// ── WelcomeDashboard ──────────────────────────────────────────────────────────

/** Owner Center home page. Static placeholder — no API calls. */
export function WelcomeDashboard(): React.ReactElement {
  const { locale } = useLanguage();
  const l = (bundle: L10n<string>) => t(bundle, locale);

  return (
    <div className="dashboard">

      {/* ── Welcome bar ── */}
      <div className="dashboard-welcome">
        <div className="dashboard-welcome__text">
          <h1 className="dashboard-welcome__title">{l(COPY.title)}</h1>
          <p className="dashboard-welcome__subtitle">
            {l(COPY.subtitle)}
            <span className="db-meta-sep" aria-hidden="true"> · </span>
            <span className="db-last-updated">{l(COPY.lastUpdated)}</span>
          </p>
        </div>
        <StatusChip
          status="operational"
          label={l(COPY.allSystemsNormal)}
          className="dashboard-welcome__badge"
        />
      </div>

      {/* ── KPI Summary ── */}
      <DashboardSection heading={l(COPY.secSummary)}>
        <div className="db-kpi-grid">
          {KPI_CARDS.map((card) => (
            <KpiCardItem key={card.label.en} card={card} locale={locale} />
          ))}
        </div>
      </DashboardSection>

      {/* ── Platform Readiness ── */}
      <DashboardSection heading={l(COPY.secReadiness)}>
        <div className="status-grid db-readiness-grid">
          {READINESS_CARDS.map((card) => (
            <ReadinessCardItem key={card.name.en} card={card} locale={locale} />
          ))}
        </div>
      </DashboardSection>

      {/* ── Owner Center Progress ── */}
      <DashboardSection heading={l(COPY.secProgress)}>
        <div className="db-progress-block">
          <div className="db-progress-row">
            <span className="db-progress-label">{l(COPY.progressText)}</span>
            <span className="db-progress-pct">{l(COPY.progressPct)}</span>
          </div>
          <div className="db-progress" role="progressbar" aria-valuenow={87} aria-valuemin={0} aria-valuemax={100}>
            <div className="db-progress__fill" style={{ width: '87%' }} />
          </div>
          <div className="db-module-list">
            {MODULE_CHIPS.map((chip) => (
              <span key={chip.en} className="db-module-chip db-module-chip--done">
                {l(chip)}
              </span>
            ))}
            <span className="db-module-chip">{locale === 'ar' ? 'وحدة 14' : 'Module 14'}</span>
            <span className="db-module-chip">{locale === 'ar' ? 'وحدة 15' : 'Module 15'}</span>
          </div>
          <div className="db-progress-footer">
            <Link to="/module-registry" className="db-progress-link">{l(COPY.viewModules)}</Link>
          </div>
        </div>
      </DashboardSection>

      {/* ── Quick Actions ── */}
      <DashboardSection heading={l(COPY.secActions)}>
        <div className="db-actions-grid">
          {ACTION_CARDS.map((card) => (
            <ActionCardItem key={card.to} card={card} locale={locale} />
          ))}
        </div>
      </DashboardSection>

      {/* ── Recent Activity + System Alerts ── */}
      <div className="db-two-col">

        <div className="db-panel">
          <div className="db-panel__head">
            <span className="db-panel__title">{l(COPY.secActivity)}</span>
          </div>
          <div className="db-panel__body">
            <EmptyPanel message={l(COPY.noActivity)} />
          </div>
        </div>

        <div className="db-panel">
          <div className="db-panel__head">
            <span className="db-panel__title">{l(COPY.secAlerts)}</span>
            <StatusChip
              status="operational"
              label={locale === 'ar' ? 'صافٍ' : 'Clear'}
            />
          </div>
          <div className="db-panel__body">
            <EmptyPanel message={l(COPY.noAlerts)} />
          </div>
        </div>

      </div>

    </div>
  );
}
