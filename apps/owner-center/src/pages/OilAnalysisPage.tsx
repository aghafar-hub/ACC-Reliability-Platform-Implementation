// apps/owner-center/src/pages/OilAnalysisPage.tsx
// Oil Analysis Module — Sprint 01 scaffold, Sprint 02 registry + intake.
//
// Internal sub-routing handles all module nav paths.
// All copy is bilingual (EN/AR).

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { StatusChip } from '../components/StatusChip';
import {
  oilSampleService,
  computeSampleCondition,
} from '../modules/oil-analysis/sample.service';
import type { OilSampleRow } from '../modules/oil-analysis/sample.service';
import SampleRegistry from './oil-analysis/SampleRegistry';
import SampleIntake from './oil-analysis/SampleIntake';
import LabResults from './oil-analysis/LabResults';
import PdfImport from './oil-analysis/PdfImport';
import EngineerReview from './oil-analysis/EngineerReview';
import Trends from './oil-analysis/Trends';

// ── Locale helpers ─────────────────────────────────────────────────────────────

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

// ── Types ──────────────────────────────────────────────────────────────────────

type KpiVariant = 'operational' | 'warning' | 'critical' | 'maintenance';

interface OilAnalysisKpiCard {
  readonly label:   L10n<string>;
  readonly value:   L10n<string>;
  readonly subtext: L10n<string>;
  readonly variant: KpiVariant;
}

// ── Static copy ────────────────────────────────────────────────────────────────

const COPY = {
  moduleTitle:  { en: 'Oil Analysis',                                              ar: 'تحليل الزيت'                              },
  moduleDesc:   { en: 'Laboratory oil analysis sample intake, results, and anomaly monitoring.', ar: 'استقبال عينات تحليل الزيت المختبرية والنتائج ومراقبة الشذوذ.' },
  statusReady:  { en: 'Module Ready',                                              ar: 'الوحدة جاهزة'                             },
  secSummary:   { en: 'Summary',                                                   ar: 'الملخص'                                   },
  secRecent:    { en: 'Recent Samples',                                            ar: 'العينات الأخيرة'                          },
  secAlerts:    { en: 'Active Alerts',                                             ar: 'التنبيهات النشطة'                         },
  noSamples:    { en: 'No oil analysis samples recorded yet.',                     ar: 'لم يتم تسجيل عينات تحليل زيت بعد.'        },
  noAlerts:     { en: 'No active alerts.',                                         ar: 'لا توجد تنبيهات نشطة.'                    },
  alertsClear:  { en: 'Clear',                                                     ar: 'صافٍ'                                     },
  comingSoon:   { en: 'Available in a future sprint',                              ar: 'متاح في sprint قادم'                      },
  kpiCritical:  { en: 'Critical results',                                          ar: 'نتائج حرجة'                               },
  kpiOpenRec:   { en: 'Monitoring recommended',                                    ar: 'يُوصى بالمراقبة'                          },
  kpiCompleted: { en: 'Confirmed this month',                                      ar: 'مؤكدة هذا الشهر'                          },
  kpiLpMap:     { en: 'Missing LP reference',                                      ar: 'مرجع نقطة مفقود'                          },
  kpiPending:   { en: 'Awaiting review',                                           ar: 'بانتظار المراجعة'                         },
  kpiPdfPending:{ en: 'PDF imports awaiting review',                               ar: 'استيرادات PDF بانتظار المراجعة'           },
  kpiPendingApproval: { en: 'Awaiting engineer sign-off',                        ar: 'بانتظار اعتماد المهندس'                   },
  kpiApprovedToday:   { en: 'Signed off today',                                  ar: 'اعتُمدت اليوم'                            },
  kpiTotal:     { en: 'All registered samples',                                    ar: 'جميع العينات المسجلة'                     },
  alertCritical:{ en: 'critical sample(s) require immediate action.',              ar: 'عينة/عينات حرجة تتطلب إجراءً فورياً.'     },
  alertCaution: { en: 'sample(s) with open recommendations.',                        ar: 'عينة/عينات بتوصيات مفتوحة.'               },

  samplesTitle:     { en: 'Samples',         ar: 'العينات'           },
  samplesDesc:      { en: 'Browse and manage oil analysis sample records across all equipment.', ar: 'استعراض وإدارة سجلات عينات تحليل الزيت لجميع المعدات.' },
  intakeTitle:      { en: 'Sample Intake',   ar: 'استقبال العينات'   },
  intakeDesc:       { en: 'Register new field samples and prepare them for laboratory submission.', ar: 'تسجيل عينات ميدانية جديدة وتجهيزها للإرسال إلى المختبر.' },
  labResultsTitle:  { en: 'Lab Results',     ar: 'نتائج المختبر'     },
  labResultsDesc:   { en: 'Review, enter, and confirm laboratory analysis results.', ar: 'مراجعة وإدخال وتأكيد نتائج التحليل المختبري.' },
  pdfImportTitle:   { en: 'PDF Import',      ar: 'استيراد PDF'       },
  pdfImportDesc:    { en: 'Attach lab report PDF metadata and review imports.', ar: 'إرفاق بيانات تقرير المختبر PDF ومراجعة الاستيرادات.' },
  reviewTitle:      { en: 'Engineer Review', ar: 'مراجعة المهندس'    },
  reviewDesc:       { en: 'Review analysed samples and approve laboratory results.', ar: 'مراجعة العينات المحللة والموافقة على نتائج المختبر.' },
  trendsTitle:      { en: 'Trends',          ar: 'الاتجاهات'         },
  trendsDesc:       { en: 'Track parameter trends and condition changes over sample history.', ar: 'تتبع اتجاهات المعاملات وتغيرات الحالة عبر سجل العينات.' },
  reportsTitle:     { en: 'Reports',         ar: 'التقارير'          },
  reportsDesc:      { en: 'Generate compliance, anomaly, and laboratory summary reports.', ar: 'إنشاء تقارير الامتثال والشذوذ وملخصات المختبر.' },
  settingsTitle:    { en: 'Module Settings', ar: 'إعدادات الوحدة'    },
  settingsDesc:     { en: 'Configure alert thresholds, parameter sets, and intake workflows.', ar: 'ضبط حدود التنبيه ومجموعات المعاملات وسير استقبال العينات.' },
} as const;

// ── Dashboard helpers ──────────────────────────────────────────────────────────

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

function OilAnalysisKpiCardItem({
  card,
  locale,
}: {
  card: OilAnalysisKpiCard;
  locale: string;
}): React.ReactElement {
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

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

function OilAnalysisDashboard(): React.ReactElement {
  const { locale } = useLanguage();
  const l = (bundle: L10n<string>) => t(bundle, locale);

  const kpis = oilSampleService.computeDashboardKpis();
  const samples = oilSampleService.list();

  const recentSamples = [...samples]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const alertSamples = samples.filter(
    (s) => {
      const cond = computeSampleCondition(s);
      return cond === 'critical' || cond === 'caution' || cond === 'monitor';
    },
  );

  const kpiCards: readonly OilAnalysisKpiCard[] = [
    {
      label:   { en: 'Total Samples',           ar: 'إجمالي العينات'           },
      value:   { en: String(kpis.totalSamples), ar: String(kpis.totalSamples)  },
      subtext: COPY.kpiTotal,
      variant: 'operational',
    },
    {
      label:   { en: 'Pending Review',          ar: 'بانتظار المراجعة'         },
      value:   { en: String(kpis.pendingReview), ar: String(kpis.pendingReview) },
      subtext: COPY.kpiPending,
      variant: kpis.pendingReview > 0 ? 'maintenance' : 'operational',
    },
    {
      label:   { en: 'Pending Approval',        ar: 'بانتظار الموافقة'         },
      value:   { en: String(kpis.pendingApproval), ar: String(kpis.pendingApproval) },
      subtext: COPY.kpiPendingApproval,
      variant: kpis.pendingApproval > 0 ? 'maintenance' : 'operational',
    },
    {
      label:   { en: 'Approved Today',          ar: 'اعتُمدت اليوم'            },
      value:   { en: String(kpis.approvedToday), ar: String(kpis.approvedToday) },
      subtext: COPY.kpiApprovedToday,
      variant: kpis.approvedToday > 0 ? 'operational' : 'operational',
    },
    {
      label:   { en: 'PDF Pending Review',      ar: 'PDF بانتظار المراجعة'     },
      value:   { en: String(kpis.pdfPendingReview), ar: String(kpis.pdfPendingReview) },
      subtext: COPY.kpiPdfPending,
      variant: kpis.pdfPendingReview > 0 ? 'warning' : 'operational',
    },
    {
      label:   { en: 'Needs LP Mapping',        ar: 'تحتاج ربط نقطة التشحيم'   },
      value:   { en: String(kpis.needsLpMapping), ar: String(kpis.needsLpMapping) },
      subtext: COPY.kpiLpMap,
      variant: kpis.needsLpMapping > 0 ? 'warning' : 'operational',
    },
    {
      label:   { en: 'Critical',                ar: 'حرج'                      },
      value:   { en: String(kpis.critical),   ar: String(kpis.critical)      },
      subtext: COPY.kpiCritical,
      variant: kpis.critical > 0 ? 'critical' : 'operational',
    },
    {
      label:   { en: 'Completed This Month',    ar: 'مكتملة هذا الشهر'         },
      value:   { en: String(kpis.completedThisMonth), ar: String(kpis.completedThisMonth) },
      subtext: COPY.kpiCompleted,
      variant: 'operational',
    },
    {
      label:   { en: 'Open Recommendations',    ar: 'توصيات مفتوحة'            },
      value:   { en: String(kpis.openRecommendations), ar: String(kpis.openRecommendations) },
      subtext: COPY.kpiOpenRec,
      variant: kpis.openRecommendations > 0 ? 'warning' : 'operational',
    },
  ];

  return (
    <div className="dashboard">
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

      <DashboardSection heading={l(COPY.secSummary)}>
        <div className="ol-kpi-grid">
          {kpiCards.map((card) => (
            <OilAnalysisKpiCardItem key={card.label.en} card={card} locale={locale} />
          ))}
        </div>
      </DashboardSection>

      <div className="db-two-col">
        <div className="db-panel">
          <div className="db-panel__head">
            <span className="db-panel__title">{l(COPY.secRecent)}</span>
          </div>
          <div className="db-panel__body">
            {recentSamples.length === 0 ? (
              <EmptyPanel message={l(COPY.noSamples)} />
            ) : (
              <ul className="ol-db-list">
                {recentSamples.map((s: OilSampleRow) => (
                  <li key={s.id} className="ol-db-list__item">
                    <span className="ol-db-list__badge">{s.sampleId}</span>
                    <span className="ol-db-list__name">{s.equipmentId}</span>
                    <span className="ol-db-list__meta">{s.labSampleId} · {formatDate(s.sampledAt)}</span>
                    <span className={`ol-db-list__status ol-db-list__status--${s.status}`}>
                      {s.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="db-panel">
          <div className="db-panel__head">
            <span className="db-panel__title">{l(COPY.secAlerts)}</span>
            {alertSamples.length === 0 ? (
              <StatusChip status="operational" label={l(COPY.alertsClear)} />
            ) : null}
          </div>
          <div className="db-panel__body">
            {alertSamples.length === 0 ? (
              <EmptyPanel message={l(COPY.noAlerts)} />
            ) : (
              <ul className="ol-db-alerts">
                {kpis.critical > 0 && (
                  <li className="ol-db-alerts__item ol-db-alerts__item--critical">
                    <span className="ol-db-alerts__icon" aria-hidden="true">⚠</span>
                    <span>{kpis.critical} {l(COPY.alertCritical)}</span>
                  </li>
                )}
                {kpis.openRecommendations > 0 && (
                  <li className="ol-db-alerts__item ol-db-alerts__item--warning">
                    <span className="ol-db-alerts__icon" aria-hidden="true">📋</span>
                    <span>{kpis.openRecommendations} {l(COPY.alertCaution)}</span>
                  </li>
                )}
              </ul>
            )}
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

function OilAnalysisSubPage({ initials, title, desc }: SubPageDef): React.ReactElement {
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

// ── OilAnalysisPage — root with nested sub-routing ────────────────────────────

export default function OilAnalysisPage(): React.ReactElement {
  return (
    <Routes>
      <Route index element={<OilAnalysisDashboard />} />

      <Route path="samples" element={<SampleRegistry />} />
      <Route path="intake" element={<SampleIntake />} />
      <Route path="lab-results" element={<LabResults />} />
      <Route path="pdf-import" element={<PdfImport />} />
      <Route path="review" element={<EngineerReview />} />
      <Route path="trends" element={<Trends />} />
      <Route
        path="reports"
        element={<OilAnalysisSubPage initials="RP" title={COPY.reportsTitle} desc={COPY.reportsDesc} />}
      />
      <Route
        path="settings"
        element={<OilAnalysisSubPage initials="ST" title={COPY.settingsTitle} desc={COPY.settingsDesc} />}
      />

      <Route path="*" element={<Navigate to="/oil-analysis" replace />} />
    </Routes>
  );
}
