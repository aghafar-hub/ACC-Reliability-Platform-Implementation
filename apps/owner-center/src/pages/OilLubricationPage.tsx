// apps/owner-center/src/pages/OilLubricationPage.tsx
// Oil Lubrication Module — v2 Sprint 01
//
// Scope: Module foundation and dashboard only.
// Internal sub-routing handles all seven module nav paths.
// No API calls, no business data — all values are zero / empty-state.
// All copy is bilingual (EN/AR).

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { StatusChip } from '../components/StatusChip';

// ── Locale helpers ─────────────────────────────────────────────────────────────

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

// ── Types ──────────────────────────────────────────────────────────────────────

type KpiVariant = 'operational' | 'warning' | 'critical' | 'maintenance';

interface OilKpiCard {
  readonly label:   L10n<string>;
  readonly value:   L10n<string>;
  readonly subtext: L10n<string>;
  readonly variant: KpiVariant;
}

// ── Static copy ────────────────────────────────────────────────────────────────

const COPY = {
  moduleTitle: { en: 'Oil Lubrication',                                         ar: 'تشحيم الزيت'                              },
  moduleDesc:  { en: 'Oil change management and lubrication point tracking.',    ar: 'إدارة تغيير الزيت وتتبع نقاط التشحيم.'   },
  statusReady: { en: 'Module Ready',                                             ar: 'الوحدة جاهزة'                             },

  secSummary:  { en: 'Summary',                                                  ar: 'الملخص'                                   },
  secChanges:  { en: 'Recent Oil Changes',                                       ar: 'تغييرات الزيت الأخيرة'                    },
  secTasks:    { en: 'Upcoming Lubrication Tasks',                               ar: 'مهام التشحيم القادمة'                      },
  secRoutes:   { en: 'Route Status',                                             ar: 'حالة المسارات'                            },
  secAlerts:   { en: 'Alerts',                                                   ar: 'التنبيهات'                                },

  noChanges:   { en: 'No oil changes recorded yet.',                             ar: 'لم يتم تسجيل تغييرات زيت بعد.'            },
  noTasks:     { en: 'No upcoming tasks scheduled.',                             ar: 'لا توجد مهام قادمة مجدولة.'               },
  noRoutes:    { en: 'No active routes configured.',                             ar: 'لا توجد مسارات نشطة مهيأة.'               },
  noAlerts:    { en: 'No active alerts.',                                        ar: 'لا توجد تنبيهات نشطة.'                    },
  alertsClear: { en: 'Clear',                                                    ar: 'صافٍ'                                     },

  comingSoon:  { en: 'Available in Sprint 02',                                   ar: 'متاح في Sprint 02'                        },

  oilChangeTitle: { en: 'Oil Change',      ar: 'تغيير الزيت'    },
  oilChangeDesc:  { en: 'Record and manage oil change work orders, service intervals, and completion tracking.', ar: 'تسجيل وإدارة أوامر عمل تغيير الزيت وفترات الخدمة وتتبع الإنجاز.' },

  samplingTitle:  { en: 'Sampling',        ar: 'أخذ العينات'    },
  samplingDesc:   { en: 'Log oil sample submissions, track laboratory results, and flag anomalies.', ar: 'تسجيل عينات الزيت وتتبع النتائج المختبرية وتحديد الشذوذات.' },

  routesTitle:    { en: 'Routes',          ar: 'المسارات'       },
  routesDesc:     { en: 'Define and manage lubrication technician routes and point assignments.', ar: 'تحديد وإدارة مسارات الفنيين ونقاط التشحيم.' },

  forecastTitle:  { en: 'Forecast',        ar: 'التوقعات'       },
  forecastDesc:   { en: 'AI-assisted consumption forecasting, due-date prediction, and reorder planning.', ar: 'توقعات الاستهلاك بمساعدة الذكاء الاصطناعي وتنبؤات المواعيد وتخطيط إعادة الطلب.' },

  reportsTitle:   { en: 'Reports',         ar: 'التقارير'       },
  reportsDesc:    { en: 'Generate compliance, consumption, and performance reports for oil lubrication operations.', ar: 'إنشاء تقارير الامتثال والاستهلاك والأداء لعمليات تشحيم الزيت.' },

  settingsTitle:  { en: 'Module Settings', ar: 'إعدادات الوحدة' },
  settingsDesc:   { en: 'Configure lubrication points, oil types, service intervals, approval workflows, and alert thresholds.', ar: 'ضبط نقاط التشحيم وأنواع الزيت وفترات الصيانة وسير الموافقة وحدود التنبيه.' },
} as const;

// ── KPI card data ──────────────────────────────────────────────────────────────

const KPI_CARDS: readonly OilKpiCard[] = [
  {
    label:   { en: 'Total Lubrication Points',   ar: 'إجمالي نقاط التشحيم'     },
    value:   { en: '0',                          ar: '٠'                        },
    subtext: { en: 'None configured',            ar: 'لم يتم الضبط بعد'        },
    variant: 'operational',
  },
  {
    label:   { en: 'Due Soon',                   ar: 'مستحق قريباً'            },
    value:   { en: '0',                          ar: '٠'                        },
    subtext: { en: 'Within 7 days',              ar: 'خلال 7 أيام'              },
    variant: 'warning',
  },
  {
    label:   { en: 'Overdue',                    ar: 'متأخر'                   },
    value:   { en: '0',                          ar: '٠'                        },
    subtext: { en: 'Past due date',              ar: 'تجاوز الموعد المحدد'     },
    variant: 'critical',
  },
  {
    label:   { en: 'Pending Approvals',          ar: 'الموافقات المعلقة'       },
    value:   { en: '0',                          ar: '٠'                        },
    subtext: { en: 'Awaiting review',            ar: 'في انتظار المراجعة'      },
    variant: 'warning',
  },
  {
    label:   { en: 'Active Routes',              ar: 'المسارات النشطة'         },
    value:   { en: '0',                          ar: '٠'                        },
    subtext: { en: 'No routes configured',       ar: 'لا توجد مسارات مهيأة'   },
    variant: 'maintenance',
  },
  {
    label:   { en: 'Oil Consumption This Month', ar: 'استهلاك الزيت هذا الشهر' },
    value:   { en: '0 L',                        ar: '٠ ل'                      },
    subtext: { en: 'No records yet',             ar: 'لا توجد سجلات بعد'       },
    variant: 'operational',
  },
];

// ── Shared dashboard sub-components ───────────────────────────────────────────

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

function StatusDot({ variant }: { variant: KpiVariant }): React.ReactElement {
  return <span className={`db-status-dot db-status-dot--${variant}`} aria-hidden="true" />;
}

function OilKpiCardItem({ card, locale }: { card: OilKpiCard; locale: string }): React.ReactElement {
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

function EmptyPanel({ message }: { message: string }): React.ReactElement {
  return <p className="db-panel__empty">{message}</p>;
}

// ── Dashboard route ────────────────────────────────────────────────────────────

function OilDashboard(): React.ReactElement {
  const { locale } = useLanguage();
  const l = (bundle: L10n<string>) => t(bundle, locale);

  return (
    <div className="dashboard">

      {/* Module header ─────────────────────────────────────────────────────── */}
      <div className="dashboard-welcome">
        <div className="dashboard-welcome__text">
          <h1 className="dashboard-welcome__title">{l(COPY.moduleTitle)}</h1>
          <p className="dashboard-welcome__subtitle">{l(COPY.moduleDesc)}</p>
        </div>
        <StatusChip
          status="operational"
          label={l(COPY.statusReady)}
          className="dashboard-welcome__badge"
        />
      </div>

      {/* KPI summary — 6 cards in 3-column grid ─────────────────────────────── */}
      <DashboardSection heading={l(COPY.secSummary)}>
        <div className="ol-kpi-grid">
          {KPI_CARDS.map((card) => (
            <OilKpiCardItem key={card.label.en} card={card} locale={locale} />
          ))}
        </div>
      </DashboardSection>

      {/* Recent Changes + Upcoming Tasks ─────────────────────────────────────── */}
      <div className="db-two-col">
        <div className="db-panel">
          <div className="db-panel__head">
            <span className="db-panel__title">{l(COPY.secChanges)}</span>
          </div>
          <div className="db-panel__body">
            <EmptyPanel message={l(COPY.noChanges)} />
          </div>
        </div>

        <div className="db-panel">
          <div className="db-panel__head">
            <span className="db-panel__title">{l(COPY.secTasks)}</span>
          </div>
          <div className="db-panel__body">
            <EmptyPanel message={l(COPY.noTasks)} />
          </div>
        </div>
      </div>

      {/* Route Status + Alerts ───────────────────────────────────────────────── */}
      <div className="db-two-col">
        <div className="db-panel">
          <div className="db-panel__head">
            <span className="db-panel__title">{l(COPY.secRoutes)}</span>
          </div>
          <div className="db-panel__body">
            <EmptyPanel message={l(COPY.noRoutes)} />
          </div>
        </div>

        <div className="db-panel">
          <div className="db-panel__head">
            <span className="db-panel__title">{l(COPY.secAlerts)}</span>
            <StatusChip status="operational" label={l(COPY.alertsClear)} />
          </div>
          <div className="db-panel__body">
            <EmptyPanel message={l(COPY.noAlerts)} />
          </div>
        </div>
      </div>

    </div>
  );
}

// ── Sub-page placeholder ───────────────────────────────────────────────────────

interface SubPageDef {
  readonly initials: string;
  readonly title:    L10n<string>;
  readonly desc:     L10n<string>;
}

function OilSubPage({ initials, title, desc }: SubPageDef): React.ReactElement {
  const { locale } = useLanguage();
  const l = (bundle: L10n<string>) => t(bundle, locale);

  return (
    <div className="placeholder-page">
      <div className="placeholder-page__icon" aria-hidden="true">{initials}</div>
      <h1 className="placeholder-page__title">{l(title)}</h1>
      <p className="placeholder-page__subtitle">{l(desc)}</p>
      <span className="placeholder-page__status">{l(COPY.comingSoon)}</span>
    </div>
  );
}

// ── OilLubricationPage — root with nested sub-routing ─────────────────────────
//
// The platform manifest registers this component at /oil-lubrication and also
// /oil-lubrication/* (because moduleNavItems is declared).  Internal <Routes>
// picks up the remainder of the path and renders the correct sub-page.

export default function OilLubricationPage(): React.ReactElement {
  return (
    <Routes>

      <Route index element={<OilDashboard />} />

      <Route
        path="oil-change"
        element={
          <OilSubPage
            initials="OC"
            title={COPY.oilChangeTitle}
            desc={COPY.oilChangeDesc}
          />
        }
      />

      <Route
        path="sampling"
        element={
          <OilSubPage
            initials="SA"
            title={COPY.samplingTitle}
            desc={COPY.samplingDesc}
          />
        }
      />

      <Route
        path="routes"
        element={
          <OilSubPage
            initials="RT"
            title={COPY.routesTitle}
            desc={COPY.routesDesc}
          />
        }
      />

      <Route
        path="forecast"
        element={
          <OilSubPage
            initials="FC"
            title={COPY.forecastTitle}
            desc={COPY.forecastDesc}
          />
        }
      />

      <Route
        path="reports"
        element={
          <OilSubPage
            initials="RP"
            title={COPY.reportsTitle}
            desc={COPY.reportsDesc}
          />
        }
      />

      <Route
        path="settings"
        element={
          <OilSubPage
            initials="ST"
            title={COPY.settingsTitle}
            desc={COPY.settingsDesc}
          />
        }
      />

      {/* Unknown sub-paths fall back to dashboard */}
      <Route path="*" element={<Navigate to="/oil-lubrication" replace />} />

    </Routes>
  );
}
