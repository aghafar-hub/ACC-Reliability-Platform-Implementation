// apps/owner-center/src/pages/WelcomeDashboard.tsx
// Welcome Dashboard shell — the Owner Center home page.
//
// Fully static: no API calls, no fake backend data, no auth changes.
// All copy is bilingual (EN/AR) via inline locale objects.
// Locale and theme are consumed from existing context hooks.

import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

// ── Locale helpers ────────────────────────────────────────────────────────────

interface L10n<T> {
  en: T;
  ar: T;
}

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

// ── Static copy ───────────────────────────────────────────────────────────────

const COPY = {
  welcome:        { en: 'Welcome to ACC Owner Center',     ar: 'مرحباً بك في مركز المالك' },
  subtitle:       { en: 'Platform shell is ready.',        ar: 'منصة القشرة جاهزة.' },
  platformReady:  { en: 'Platform ready',                  ar: 'المنصة جاهزة' },

  statusTitle:    { en: 'Platform Status',                 ar: 'حالة المنصة' },
  statusReady:    { en: 'Ready',                           ar: 'جاهز' },
  shellCard:      { en: 'App Shell',                       ar: 'غلاف التطبيق' },
  shellDesc:      { en: 'Layout, routing, and providers initialised.', ar: 'تم تهيئة التخطيط والتوجيه ومزودي الخدمة.' },
  sdkCard:        { en: 'Platform SDK',                    ar: 'SDK المنصة' },
  sdkDesc:        { en: 'Type contracts loaded. Service wiring pending.', ar: 'تم تحميل عقود الأنواع. ربط الخدمات معلق.' },
  oilCard:        { en: 'Oil Lubrication',                 ar: 'تشحيم الزيت' },
  oilDesc:        { en: 'Data model ready. UI workflow pending.',        ar: 'نموذج البيانات جاهز. سير العمل معلق.' },

  actionsTitle:   { en: 'Quick Actions',                   ar: 'إجراءات سريعة' },
  recordOil:      { en: 'Record Oil Change',               ar: 'تسجيل تغيير الزيت' },
  viewNotif:      { en: 'View Notifications',              ar: 'عرض الإشعارات' },

  notifTitle:     { en: 'Notifications',                   ar: 'الإشعارات' },
  notifEmpty:     { en: 'No notifications at this time.',  ar: 'لا توجد إشعارات في الوقت الحالي.' },

  learningTitle:  { en: 'Learning Center',                 ar: 'مركز التعلم' },
  learningDesc:   { en: 'Role-aware help articles and guided tours for every module. Register topics from your module to appear here.', ar: 'مقالات مساعدة وجولات إرشادية لكل وحدة. سجّل المواضيع من وحدتك لتظهر هنا.' },
  learningLink:   { en: 'Go to Learning Center',           ar: 'انتقل إلى مركز التعلم' },

  oilModTitle:    { en: 'Oil Lubrication Module',          ar: 'وحدة تشحيم الزيت' },
  oilModDesc:     { en: 'Manage oil change records and lubrication points for all equipment under your contractor scope.', ar: 'إدارة سجلات تغيير الزيت ونقاط التشحيم لجميع المعدات ضمن نطاق المقاول.' },
  oilModLink:     { en: 'Open Module',                     ar: 'فتح الوحدة' },
} as const;

// ── Sub-components ────────────────────────────────────────────────────────────

/** Section wrapper with an accessible heading. */
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

/** Single platform status card. */
function StatusCard({
  title,
  description,
  statusLabel,
}: {
  title: string;
  description: string;
  statusLabel: string;
}): React.ReactElement {
  return (
    <div className="status-card">
      <div className="status-card__header">
        <span className="status-card__title">{title}</span>
        <span className="status-chip status-chip--ready">{statusLabel}</span>
      </div>
      <p className="status-card__desc">{description}</p>
    </div>
  );
}

/** Full-width informational card with an optional nav link. */
function InfoCard({
  title,
  description,
  linkTo,
  linkLabel,
}: {
  title: string;
  description: string;
  linkTo: string;
  linkLabel: string;
}): React.ReactElement {
  return (
    <div className="info-card">
      <div className="info-card__body">
        <h3 className="info-card__title">{title}</h3>
        <p className="info-card__desc">{description}</p>
      </div>
      <Link to={linkTo} className="info-card__link">
        {linkLabel}
      </Link>
    </div>
  );
}

// ── WelcomeDashboard ──────────────────────────────────────────────────────────

/** Owner Center home page. Static shell — no API calls. */
export function WelcomeDashboard(): React.ReactElement {
  const { locale } = useLanguage();
  const l = (bundle: L10n<string>) => t(bundle, locale);

  return (
    <div className="dashboard">

      {/* ── Welcome bar ── */}
      <div className="dashboard-welcome">
        <div className="dashboard-welcome__text">
          <h1 className="dashboard-welcome__title">{l(COPY.welcome)}</h1>
          <p className="dashboard-welcome__subtitle">{l(COPY.subtitle)}</p>
        </div>
        <span className="status-chip status-chip--ready dashboard-welcome__badge">
          {l(COPY.platformReady)}
        </span>
      </div>

      {/* ── Platform status ── */}
      <DashboardSection heading={l(COPY.statusTitle)}>
        <div className="status-grid">
          <StatusCard
            title={l(COPY.shellCard)}
            description={l(COPY.shellDesc)}
            statusLabel={l(COPY.statusReady)}
          />
          <StatusCard
            title={l(COPY.sdkCard)}
            description={l(COPY.sdkDesc)}
            statusLabel={l(COPY.statusReady)}
          />
          <StatusCard
            title={l(COPY.oilCard)}
            description={l(COPY.oilDesc)}
            statusLabel={l(COPY.statusReady)}
          />
        </div>
      </DashboardSection>

      {/* ── Quick actions ── */}
      <DashboardSection heading={l(COPY.actionsTitle)}>
        <div className="action-row">
          <Link to="/oil-lubrication" className="action-btn">
            {l(COPY.recordOil)}
          </Link>
          <Link to="/notifications" className="action-btn action-btn--secondary">
            {l(COPY.viewNotif)}
          </Link>
        </div>
      </DashboardSection>

      {/* ── Notifications ── */}
      <DashboardSection heading={l(COPY.notifTitle)}>
        <div className="info-card info-card--empty">
          <p className="info-card__empty-msg">{l(COPY.notifEmpty)}</p>
        </div>
      </DashboardSection>

      {/* ── Learning Center ── */}
      <DashboardSection heading={l(COPY.learningTitle)}>
        <InfoCard
          title={l(COPY.learningTitle)}
          description={l(COPY.learningDesc)}
          linkTo="/learning"
          linkLabel={l(COPY.learningLink)}
        />
      </DashboardSection>

      {/* ── Oil Lubrication ── */}
      <DashboardSection heading={l(COPY.oilModTitle)}>
        <InfoCard
          title={l(COPY.oilModTitle)}
          description={l(COPY.oilModDesc)}
          linkTo="/oil-lubrication"
          linkLabel={l(COPY.oilModLink)}
        />
      </DashboardSection>

    </div>
  );
}
