// apps/owner-center/src/pages/SystemHealthPage.tsx
// System Health Center — functional page backed by sdk.health.
//
// Phase 1I: replaces the static placeholder with live platform health data.
// Read-only monitoring — no audit records on view or refresh.
// Bilingual EN/AR with RTL support.

import React, { useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePlatformSdk } from '../context/SdkContext';
import { SummaryCard } from '../components/SummaryCard';
import { StatusChip } from '../components/StatusChip';
import type { ChipStatus } from '../components/StatusChip';
import type {
  HealthSummary,
  HealthComponentStatus,
  HealthCheckResult,
  HealthStatus,
} from '@acc-reliability/sdk';

// ── Locale helpers ────────────────────────────────────────────────────────────

interface L10n { en: string; ar: string; }
function t(b: L10n, locale: string): string {
  return locale === 'ar' ? b.ar : b.en;
}

// ── Copy ──────────────────────────────────────────────────────────────────────

const COPY = {
  pageTitle:       { en: 'System Health Center',        ar: 'مركز صحة النظام' },
  pageDesc:        { en: 'Monitor platform readiness, review module and storage health, inspect background job status, track performance metrics, and act on platform recommendations.', ar: 'مراقبة جاهزية المنصة ومراجعة صحة الوحدات والتخزين وفحص حالة المهام الخلفية وتتبع مقاييس الأداء والتصرف بناءً على توصيات المنصة.' },
  liveData:        { en: 'Live data',                   ar: 'بيانات حية' },

  ruleHeading:     { en: 'Health Evaluation Rule',      ar: 'قاعدة تقييم الصحة' },
  ruleText:        { en: 'System Health evaluates platform readiness only. Modules provide health metrics; the Health Center computes readiness, health score, alerts and recommendations without impacting platform performance.', ar: 'تُقيِّم صحة النظام جاهزية المنصة فقط. توفر الوحدات مقاييس الصحة؛ يحسب مركز الصحة الجاهزية ودرجة الصحة والتنبيهات والتوصيات دون التأثير على أداء المنصة.' },

  overallStatus:   { en: 'Overall Platform Status',     ar: 'حالة المنصة العامة' },
  healthyServices: { en: 'Healthy Services',            ar: 'الخدمات السليمة' },
  warningServices: { en: 'Warning Services',            ar: 'خدمات التحذير' },
  criticalServices:{ en: 'Critical Services',           ar: 'الخدمات الحرجة' },

  refreshBtn:      { en: 'Refresh Health',              ar: 'تحديث الصحة' },
  runCheckBtn:     { en: 'Run Health Check',            ar: 'تشغيل فحص الصحة' },
  checking:        { en: 'Checking…',                   ar: 'جارٍ الفحص…' },

  colService:      { en: 'Service Name',                ar: 'اسم الخدمة' },
  colStatus:       { en: 'Status',                      ar: 'الحالة' },
  colLastCheck:    { en: 'Last Check',                  ar: 'آخر فحص' },
  colResponse:     { en: 'Response Time',               ar: 'وقت الاستجابة' },
  colVersion:      { en: 'Version',                     ar: 'الإصدار' },
  colMessage:      { en: 'Message',                     ar: 'الرسالة' },

  noServices:      { en: 'No health-monitored services registered.', ar: 'لا توجد خدمات مسجلة لمراقبة الصحة.' },

  statusHealthy:   { en: 'Healthy',    ar: 'سليم' },
  statusWarning:   { en: 'Warning',    ar: 'تحذير' },
  statusCritical:  { en: 'Critical',   ar: 'حرج' },
  statusUnknown:   { en: 'Unknown',    ar: 'غير معروف' },
  statusDegraded:  { en: 'Degraded',   ar: 'متدهور' },
  statusOffline:   { en: 'Offline',    ar: 'غير متصل' },
  statusMaint:     { en: 'Maintenance',ar: 'صيانة' },
} as const;

// ── Helper utilities ──────────────────────────────────────────────────────────

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`;
}

function extractVersion(details?: Readonly<Record<string, unknown>>): string | null {
  if (!details) return null;
  const v = details.version;
  return typeof v === 'string' ? v : null;
}

function isNeverChecked(component: HealthComponentStatus): boolean {
  return component.lastCheckedAt === null && component.checkCount === 0;
}

function healthStatusChip(
  status: HealthStatus,
  neverChecked: boolean,
  locale: string,
): { chipStatus: ChipStatus; label: string } {
  if (neverChecked) {
    return { chipStatus: 'draft', label: t(COPY.statusUnknown, locale) };
  }
  switch (status) {
    case 'healthy':
      return { chipStatus: 'operational', label: t(COPY.statusHealthy, locale) };
    case 'warning':
      return { chipStatus: 'warning', label: t(COPY.statusWarning, locale) };
    case 'degraded':
      return { chipStatus: 'warning', label: t(COPY.statusDegraded, locale) };
    case 'critical':
      return { chipStatus: 'critical', label: t(COPY.statusCritical, locale) };
    case 'offline':
      return { chipStatus: 'critical', label: t(COPY.statusOffline, locale) };
    case 'maintenance':
      return { chipStatus: 'maintenance', label: t(COPY.statusMaint, locale) };
    default:
      return { chipStatus: 'draft', label: t(COPY.statusUnknown, locale) };
  }
}

function overallStatusLabel(status: HealthStatus, locale: string): string {
  switch (status) {
    case 'healthy':     return t(COPY.statusHealthy, locale);
    case 'warning':     return t(COPY.statusWarning, locale);
    case 'degraded':    return t(COPY.statusDegraded, locale);
    case 'critical':    return t(COPY.statusCritical, locale);
    case 'offline':     return t(COPY.statusOffline, locale);
    case 'maintenance': return t(COPY.statusMaint, locale);
    default:            return t(COPY.statusUnknown, locale);
  }
}

function overallStatusModifier(
  status: HealthStatus,
): 'neutral' | 'info' | 'warning' | 'caution' {
  switch (status) {
    case 'healthy':     return 'info';
    case 'warning':
    case 'degraded':    return 'warning';
    case 'critical':
    case 'offline':     return 'caution';
    default:            return 'neutral';
  }
}

function buildVersionMap(
  results: readonly HealthCheckResult[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const result of results) {
    const version = extractVersion(result.details);
    if (version) map[result.componentId] = version;
  }
  return map;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SystemHealthPage(): React.ReactElement {
  const { locale } = useLanguage();
  const sdk = usePlatformSdk();

  const [summary, setSummary] = useState<HealthSummary>(() => sdk.health.getSummary());
  const [versions, setVersions] = useState<Record<string, string>>({});
  const [checking, setChecking] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  const refreshSummary = useCallback(() => {
    setSummary(sdk.health.getSummary());
    setOpError(null);
  }, [sdk]);

  const handleRefresh = useCallback(() => {
    refreshSummary();
  }, [refreshSummary]);

  const handleRunCheck = useCallback(async () => {
    setChecking(true);
    setOpError(null);
    try {
      const results = await sdk.health.checkAll();
      setVersions(buildVersionMap(results));
      setSummary(sdk.health.getSummary());
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Health check failed.');
    } finally {
      setChecking(false);
    }
  }, [sdk]);

  const components = summary.components;

  return (
    <div className="ur-page">

      {/* ── Page header ── */}
      <div className="ur-page__header">
        <div className="ur-page__header-text">
          <h1 className="ur-page__title">{t(COPY.pageTitle, locale)}</h1>
          <p className="ur-page__desc">{t(COPY.pageDesc, locale)}</p>
        </div>
        <StatusChip
          status="operational"
          label={t(COPY.liveData, locale)}
          className="ur-page__sdk-badge"
        />
      </div>

      {/* ── Health evaluation rule ── */}
      <div className="con-rule" role="note" aria-label={t(COPY.ruleHeading, locale)}>
        <span className="con-rule__heading">{t(COPY.ruleHeading, locale)}</span>
        <span className="con-rule__text">{t(COPY.ruleText, locale)}</span>
      </div>

      {opError && <p className="ur-inline-error">{opError}</p>}

      {/* ── Summary cards ── */}
      <div className="ur-summary-grid">
        <SummaryCard
          value={overallStatusLabel(summary.overallStatus, locale)}
          label={t(COPY.overallStatus, locale)}
          modifier={overallStatusModifier(summary.overallStatus)}
        />
        <SummaryCard
          value={String(summary.healthyCount)}
          label={t(COPY.healthyServices, locale)}
          modifier="info"
        />
        <SummaryCard
          value={String(summary.warningCount)}
          label={t(COPY.warningServices, locale)}
          modifier="warning"
        />
        <SummaryCard
          value={String(summary.criticalCount)}
          label={t(COPY.criticalServices, locale)}
          modifier="caution"
        />
      </div>

      {/* ── Toolbar ── */}
      <div className="ur-toolbar">
        <button
          type="button"
          className="ur-btn ur-btn--secondary"
          onClick={handleRefresh}
          disabled={checking}
        >
          {t(COPY.refreshBtn, locale)}
        </button>
        <button
          type="button"
          className="ur-btn ur-btn--primary"
          onClick={() => { void handleRunCheck(); }}
          disabled={checking}
        >
          {checking ? t(COPY.checking, locale) : t(COPY.runCheckBtn, locale)}
        </button>
      </div>

      {/* ── Services table ── */}
      <div className="ur-table-wrap">
        <table className="ur-table">
          <thead>
            <tr>
              <th>{t(COPY.colService, locale)}</th>
              <th>{t(COPY.colStatus, locale)}</th>
              <th>{t(COPY.colLastCheck, locale)}</th>
              <th>{t(COPY.colResponse, locale)}</th>
              <th>{t(COPY.colVersion, locale)}</th>
              <th>{t(COPY.colMessage, locale)}</th>
            </tr>
          </thead>
          <tbody>
            {components.length === 0 ? (
              <tr>
                <td colSpan={6} className="ur-table__empty">
                  {t(COPY.noServices, locale)}
                </td>
              </tr>
            ) : (
              components.map((component) => {
                const neverChecked = isNeverChecked(component);
                const chip = healthStatusChip(component.status, neverChecked, locale);
                const version = versions[component.componentId] ?? null;
                return (
                  <tr key={component.componentId}>
                    <td>
                      <div className="ur-user-name">{component.componentName}</div>
                      <div className="ur-user-email">{component.componentId}</div>
                    </td>
                    <td>
                      <StatusChip status={chip.chipStatus} label={chip.label} />
                    </td>
                    <td className="ur-table__date">
                      {formatDateTime(component.lastCheckedAt)}
                    </td>
                    <td>{formatDuration(component.lastCheckDurationMs)}</td>
                    <td>{version ?? <span className="ur-table__empty-cell">—</span>}</td>
                    <td className="ur-table__desc">
                      {component.lastMessage ?? <span className="ur-table__empty-cell">—</span>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
