// apps/owner-center/src/pages/oil-analysis/DashboardScreen.tsx
// OA-006 Oil Analysis Dashboard — UI-V2 premium industrial rebuild (Milestone UI-V2-01).
// Built entirely on apps/owner-center/src/components/ui-v2 — the legacy
// components/ui set is untouched and still used by every other screen.

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { usePlatformSdk } from '../../context/SdkContext';
import { useIsMobile } from '../../components/ui';
import {
  Accordion,
  BarChart,
  DataTable,
  DonutChart,
  FilterBar,
  KpiTile,
  LineChart,
  Panel,
  StatusChip,
  type DataTableColumnV2,
  type FilterFieldConfigV2,
  type Severity,
} from '../../components/ui-v2';
import { resolveOilAnalysisContractorScope } from '../../modules/oil-analysis/contractor-scope';
import { isApprovalWorkflowEnabled } from '../../modules/oil-analysis/settings-guards';
import {
  oilAnalysisDashboardService,
  type ActionQueueItem,
  type CriticalEquipmentRow,
  type DashboardFilterParams,
  type MonthlySamplePoint,
  type RecentActivityItem,
  type ReviewQueueItem,
} from '../../modules/oil-analysis/dashboard.service';

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

const COPY = {
  eyebrow: { en: 'Oil Analysis', ar: 'تحليل الزيت' },
  title: { en: 'Reliability Command Center', ar: 'مركز تحكم الموثوقية' },
  search: { en: 'Search LP ID, equipment…', ar: 'ابحث عن نقطة التشحيم أو المعدة…' },
  filterArea: { en: 'Area', ar: 'المنطقة' },
  filterContractor: { en: 'Contractor', ar: 'المقاول' },
  filterOilType: { en: 'Oil Type', ar: 'نوع الزيت' },
  filterStatus: { en: 'Status', ar: 'الحالة' },
  reset: { en: 'Reset', ar: 'إعادة تعيين' },
  kpiTotal: { en: 'Total LPs', ar: 'إجمالي النقاط' },
  kpiAlert: { en: 'Alert', ar: 'تنبيه' },
  kpiCaution: { en: 'Caution', ar: 'حذر' },
  kpiNormal: { en: 'Normal', ar: 'طبيعي' },
  kpiDueToday: { en: 'Due Today', ar: 'مستحق اليوم' },
  kpiOverdue: { en: 'Overdue', ar: 'متأخر' },
  kpiPendingReview: { en: 'Pending Review', ar: 'بانتظار المراجعة' },
  kpiPendingApproval: { en: 'Pending Approval', ar: 'بانتظار الاعتماد' },
  kpiOpenActions: { en: 'Open Actions', ar: 'إجراءات مفتوحة' },
  secCritical: { en: 'Critical Equipment', ar: 'المعدات الحرجة' },
  secActionQueue: { en: 'Today Action Queue', ar: 'قائمة إجراءات اليوم' },
  secReviewQueue: { en: 'Review / Approval', ar: 'المراجعة / الاعتماد' },
  secForecast: { en: 'Sampling Forecast', ar: 'توقعات جمع العينات' },
  secAnalytics: { en: 'Analytics', ar: 'التحليلات' },
  secRecent: { en: 'Recent Activity', ar: 'النشاط الأخير' },
  colLp: { en: 'LP_ID', ar: 'LP_ID' },
  colEquip: { en: 'Equip', ar: 'المعدة' },
  colArea: { en: 'Area', ar: 'المنطقة' },
  colContractor: { en: 'Contr', ar: 'المقاول' },
  colStatus: { en: 'Status', ar: 'الحالة' },
  colAction: { en: 'Action', ar: 'الإجراء' },
  colOpen: { en: '', ar: '' },
  chartContractor: { en: 'Contractor Comparison', ar: 'مقارنة المقاولين' },
  chartHealth: { en: 'Equipment Health', ar: 'صحة المعدات' },
  chartTrend: { en: 'Sample Trend', ar: 'اتجاه العينات' },
  emptyCritical: { en: 'No critical equipment.', ar: 'لا توجد معدات حرجة.' },
  emptyQueue: { en: 'Nothing pending.', ar: 'لا يوجد شيء معلّق.' },
  emptyRecent: { en: 'No recent activity.', ar: 'لا يوجد نشاط حديث.' },
  errorLoad: { en: 'Unable to load dashboard.', ar: 'تعذر تحميل لوحة المعلومات.' },
  statusAlert: { en: 'Alert', ar: 'تنبيه' },
  statusCaution: { en: 'Caution', ar: 'حذر' },
  statusOverdue: { en: 'Overdue', ar: 'متأخر' },
  footerNote: { en: 'System time · auto-refresh', ar: 'وقت النظام · تحديث تلقائي' },
  lastUpdated: { en: 'Last updated', ar: 'آخر تحديث' },
  due30: { en: '30d', ar: '30' },
  due60: { en: '60d', ar: '60' },
  due90: { en: '90d', ar: '90' },
} as const;

const STATUS_OPTIONS: ReadonlyArray<{ value: string; label: L10n<string> }> = [
  { value: 'normal', label: { en: 'Normal', ar: 'طبيعي' } },
  { value: 'caution', label: COPY.statusCaution },
  { value: 'alert', label: COPY.statusAlert },
  { value: 'pending', label: { en: 'Pending', ar: 'قيد الانتظار' } },
  { value: 'none', label: { en: 'No sample', ar: 'لا توجد عينة' } },
  { value: 'overdue', label: COPY.statusOverdue },
];

function kpiSeverity(value: number, warnAbove = 0): Severity {
  if (value <= warnAbove) return 'info';
  if (value < 5) return 'caution';
  return 'alert';
}

function reasonSeverity(reason: CriticalEquipmentRow['reason']): Severity {
  if (reason === 'alert' || reason === 'shutdown') return 'alert';
  return 'caution';
}

function reasonLabel(reason: CriticalEquipmentRow['reason'], locale: string): string {
  if (reason === 'alert' || reason === 'shutdown') return t(COPY.statusAlert, locale);
  if (reason === 'overdue') return t(COPY.statusOverdue, locale);
  return t(COPY.statusCaution, locale);
}

const HEALTH_COLORS: Record<string, string> = {
  alert: 'var(--accv2-status-alert)',
  caution: 'var(--accv2-status-caution)',
  overdue: 'var(--accv2-status-caution)',
  pending: 'var(--accv2-status-info)',
  normal: 'var(--accv2-status-normal)',
  none: 'var(--accv2-status-muted)',
};

export default function DashboardScreen(): React.ReactElement {
  const { locale } = useLanguage();
  const l = useCallback((bundle: L10n<string>) => t(bundle, locale), [locale]);
  const sdk = usePlatformSdk();
  const { status: authStatus } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const criticalRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState('');
  const [area, setArea] = useState('');
  const [contractor, setContractor] = useState('');
  const [oilType, setOilType] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const contractorScope = useMemo(() => resolveOilAnalysisContractorScope(sdk), [sdk]);

  const filterParams = useMemo<DashboardFilterParams>(
    () => ({
      search,
      area: area || undefined,
      contractor: contractor || undefined,
      oilType: oilType || undefined,
      status: status || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [search, area, contractor, oilType, status, dateFrom, dateTo],
  );

  const dashboardData = useMemo(() => {
    if (authStatus !== 'authenticated') {
      return { view: null as ReturnType<typeof oilAnalysisDashboardService.load> | null, error: null as string | null };
    }
    try {
      const filterOptions = oilAnalysisDashboardService.getFilterOptions(contractorScope);
      const view = oilAnalysisDashboardService.load(contractorScope, filterParams);
      return { view, filterOptions, error: null as string | null };
    } catch (err) {
      return {
        view: null,
        filterOptions: { lpIds: [], areas: [], contractors: [], oilTypes: [] },
        error: err instanceof Error ? err.message : 'Load failed',
      };
    }
  }, [authStatus, contractorScope, filterParams]);

  const { view, filterOptions, error } = dashboardData as {
    view: ReturnType<typeof oilAnalysisDashboardService.load> | null;
    filterOptions: ReturnType<typeof oilAnalysisDashboardService.getFilterOptions>;
    error: string | null;
  };

  const activeFilterCount = [area, contractor, oilType, status, dateFrom, dateTo].filter(Boolean).length;

  const filters: FilterFieldConfigV2[] = useMemo(() => {
    const fields: FilterFieldConfigV2[] = [
      { id: 'area', label: l(COPY.filterArea), type: 'select', value: area, placeholder: l(COPY.filterArea), options: filterOptions.areas.map((v) => ({ value: v, label: v })) },
      { id: 'oilType', label: l(COPY.filterOilType), type: 'select', value: oilType, placeholder: l(COPY.filterOilType), options: filterOptions.oilTypes.map((v) => ({ value: v, label: v })) },
      { id: 'status', label: l(COPY.filterStatus), type: 'select', value: status, placeholder: l(COPY.filterStatus), options: STATUS_OPTIONS.map((o) => ({ value: o.value, label: l(o.label) })) },
      { id: 'date', label: '', type: 'date-range', valueFrom: dateFrom, valueTo: dateTo },
    ];
    if (contractorScope.canViewAllContractors) {
      fields.splice(1, 0, { id: 'contractor', label: l(COPY.filterContractor), type: 'select', value: contractor, placeholder: l(COPY.filterContractor), options: filterOptions.contractors.map((v) => ({ value: v, label: v })) });
    }
    return fields;
  }, [area, contractor, contractorScope.canViewAllContractors, dateFrom, dateTo, filterOptions, l, oilType, status]);

  const handleClear = (): void => {
    setSearch(''); setArea('');
    if (contractorScope.canViewAllContractors) setContractor('');
    setOilType(''); setStatus(''); setDateFrom(''); setDateTo('');
  };

  const handleFilterChange = (id: string, value: string): void => {
    switch (id) {
      case 'area': setArea(value); break;
      case 'contractor': setContractor(value); break;
      case 'oilType': setOilType(value); break;
      case 'status': setStatus(value); break;
      default: break;
    }
  };

  const scrollToCritical = (): void => {
    criticalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const filterToStatus = (value: string): void => {
    setStatus(value);
    setDateFrom(''); setDateTo('');
    scrollToCritical();
  };

  const filterToToday = (): void => {
    const today = new Date().toISOString().slice(0, 10);
    setStatus('');
    setDateFrom(today);
    setDateTo(today);
    scrollToCritical();
  };

  const openEquipment = (equipmentId: string, lp?: string): void => {
    const qs = lp ? `?lp=${encodeURIComponent(lp)}` : '';
    navigate(`/oil-analysis/equipment/${encodeURIComponent(equipmentId)}${qs}`);
  };

  const criticalColumns: DataTableColumnV2<CriticalEquipmentRow>[] = useMemo(
    () => [
      { id: 'lpId', header: l(COPY.colLp), accessor: 'lpId', mono: true },
      { id: 'equipmentName', header: l(COPY.colEquip), accessor: 'equipmentName' },
      { id: 'area', header: l(COPY.colArea), accessor: 'area' },
      { id: 'contractorId', header: l(COPY.colContractor), accessor: 'contractorId' },
      {
        id: 'reportStatus',
        header: l(COPY.colStatus),
        renderCell: (row) => <StatusChip label={reasonLabel(row.reason, locale)} severity={reasonSeverity(row.reason)} />,
      },
      {
        id: 'lastAction',
        header: l(COPY.colAction),
        renderCell: (row) => <span title={row.lastAction}>{row.lastAction}</span>,
      },
      {
        id: 'open',
        header: l(COPY.colOpen),
        renderCell: (row) => (
          <button
            type="button"
            className="accv2-queue-item"
            style={{ padding: '0.15rem 0.5rem' }}
            onClick={(e) => { e.stopPropagation(); openEquipment(row.equipmentId, row.lpId); }}
          >
            →
          </button>
        ),
      },
    ],
    [l, locale],
  );

  const renderActionItem = (item: ActionQueueItem): React.ReactElement => (
    <button key={item.id} type="button" className="accv2-queue-item" onClick={() => navigate(item.route)}>
      ☐ {item.title}
    </button>
  );

  const renderQueueStat = (item: ReviewQueueItem): React.ReactElement => (
    <button key={item.id} type="button" className="accv2-stat-chip" onClick={() => navigate(item.route)}>
      <strong>{item.count}</strong> {item.label}
    </button>
  );

  const renderRecentItem = (item: RecentActivityItem): React.ReactElement => (
    <li key={item.id} className="accv2-recent-row">
      <span className="accv2-recent-kind">{item.kind}</span>
      <button type="button" className="accv2-recent-link" onClick={() => item.route && navigate(item.route)} disabled={!item.route}>
        <span className="accv2-recent-title">{item.title}</span>
        <span className="accv2-recent-sub">{item.subtitle} · {item.isoDate}</span>
      </button>
    </li>
  );

  if (error) {
    return (
      <div className="accv2-dashboard">
        <Panel title={l(COPY.errorLoad)}><p>{error}</p></Panel>
      </div>
    );
  }

  const kpis = view?.kpis;
  const charts = view?.charts;
  const forecast = view?.samplingForecast;
  const criticalRows = view ? [...view.criticalEquipment] : [];
  const trendPoints = charts?.monthlySampleTrend ?? [];
  const maxForecast = forecast ? Math.max(forecast.due30, forecast.due60, forecast.due90, 1) : 1;

  return (
    <div className="accv2-dashboard">
      <div className="accv2-command-strip">
        <div className="accv2-command-strip__header">
          <div>
            <span className="accv2-command-strip__eyebrow">{l(COPY.eyebrow)}</span>
            <h1 className="accv2-command-strip__title">{l(COPY.title)}</h1>
          </div>
          <span className="accv2-command-strip__clock">
            {new Date().toLocaleString(locale === 'ar' ? 'ar' : undefined)}
          </span>
        </div>

        {kpis && (
          <div className="accv2-kpi-row">
            <KpiTile value={kpis.totalLpsWithSampling} label={l(COPY.kpiTotal)} severity="info" onClick={() => navigate('/oil-analysis/register')} />
            <KpiTile value={kpis.alertEquipment} label={l(COPY.kpiAlert)} severity={kpiSeverity(kpis.alertEquipment)} onClick={() => filterToStatus('alert')} />
            <KpiTile value={kpis.cautionEquipment} label={l(COPY.kpiCaution)} severity={kpiSeverity(kpis.cautionEquipment)} onClick={() => filterToStatus('caution')} />
            <KpiTile value={kpis.normalEquipment} label={l(COPY.kpiNormal)} severity="normal" onClick={() => filterToStatus('normal')} />
            <KpiTile value={kpis.samplesDueToday} label={l(COPY.kpiDueToday)} severity={kpiSeverity(kpis.samplesDueToday)} onClick={filterToToday} />
            <KpiTile value={kpis.overdueSamples} label={l(COPY.kpiOverdue)} severity={kpiSeverity(kpis.overdueSamples)} onClick={() => filterToStatus('overdue')} />
            <KpiTile value={kpis.pendingReview} label={l(COPY.kpiPendingReview)} severity={kpiSeverity(kpis.pendingReview)} onClick={() => navigate('/oil-analysis/samples')} />
            {isApprovalWorkflowEnabled() && (
              <KpiTile value={kpis.pendingApproval} label={l(COPY.kpiPendingApproval)} severity={kpiSeverity(kpis.pendingApproval)} onClick={() => navigate('/oil-analysis/review')} />
            )}
            <KpiTile value={kpis.openActions} label={l(COPY.kpiOpenActions)} severity={kpiSeverity(kpis.openActions)} onClick={() => navigate('/oil-analysis/actions')} />
          </div>
        )}
      </div>

      <FilterBar
        searchValue={search}
        searchPlaceholder={l(COPY.search)}
        onSearchChange={setSearch}
        filters={filters}
        onFilterChange={handleFilterChange}
        onDateFromChange={(_id, value) => setDateFrom(value)}
        onDateToChange={(_id, value) => setDateTo(value)}
        onClear={handleClear}
        clearLabel={l(COPY.reset)}
        activeFilterCount={activeFilterCount}
      />

      <div className="accv2-main-grid" ref={criticalRef}>
        <Panel
          title={l(COPY.secCritical)}
          empty={!view || criticalRows.length === 0}
          emptyLabel={l(COPY.emptyCritical)}
        >
          {view && criticalRows.length > 0 && (
            <DataTable
              columns={criticalColumns}
              data={criticalRows}
              onRowClick={(row) => openEquipment(row.equipmentId, row.lpId)}
              getRowSeverity={(row) => reasonSeverity(row.reason)}
            />
          )}
        </Panel>

        <div className="accv2-sidebar">
          <Accordion title={l(COPY.secActionQueue)} isMobile={isMobile}>
            {view && view.todayActionQueue.length > 0 ? (
              <div className="accv2-queue-list">{view.todayActionQueue.map(renderActionItem)}</div>
            ) : (
              <p className="accv2-panel__empty">{l(COPY.emptyQueue)}</p>
            )}
          </Accordion>

          <Accordion title={l(COPY.secReviewQueue)} isMobile={isMobile}>
            {view && <div className="accv2-stat-strip">{view.reviewQueue.map(renderQueueStat)}</div>}
          </Accordion>

          <Accordion title={l(COPY.secForecast)} isMobile={isMobile}>
            {forecast && (
              <div className="accv2-forecast-bars">
                <div className="accv2-forecast-row">
                  <span>{l(COPY.due30)}</span>
                  <span className="accv2-forecast-track"><span className="accv2-forecast-fill" style={{ width: `${(forecast.due30 / maxForecast) * 100}%` }} /></span>
                  <strong>{forecast.due30}</strong>
                </div>
                <div className="accv2-forecast-row">
                  <span>{l(COPY.due60)}</span>
                  <span className="accv2-forecast-track"><span className="accv2-forecast-fill" style={{ width: `${(forecast.due60 / maxForecast) * 100}%` }} /></span>
                  <strong>{forecast.due60}</strong>
                </div>
                <div className="accv2-forecast-row">
                  <span>{l(COPY.due90)}</span>
                  <span className="accv2-forecast-track"><span className="accv2-forecast-fill" style={{ width: `${(forecast.due90 / maxForecast) * 100}%` }} /></span>
                  <strong>{forecast.due90}</strong>
                </div>
              </div>
            )}
          </Accordion>
        </div>
      </div>

      <Accordion title={l(COPY.secAnalytics)} isMobile={isMobile} className="accv2-analytics">
        {charts ? (
          <div className="accv2-charts-row">
            <BarChart
              title={l(COPY.chartContractor)}
              groups={charts.contractorComparison.map((b) => ({ label: b.contractorId, alert: b.alert, caution: b.caution, normal: b.normal }))}
            />
            <DonutChart
              title={l(COPY.chartHealth)}
              slices={charts.healthDistribution.map((s) => ({ label: s.status, value: s.count, color: HEALTH_COLORS[s.status] ?? HEALTH_COLORS.none }))}
            />
            <LineChart
              title={l(COPY.chartTrend)}
              labels={trendPoints.map((p: MonthlySamplePoint) => p.label)}
              values={trendPoints.map((p) => p.count)}
            />
          </div>
        ) : (
          <p className="accv2-panel__empty">—</p>
        )}
      </Accordion>

      <Accordion title={l(COPY.secRecent)} isMobile={isMobile}>
        {view && view.recentActivity.length > 0 ? (
          <ul className="accv2-recent-list" role="list">{view.recentActivity.map(renderRecentItem)}</ul>
        ) : (
          <p className="accv2-panel__empty">{l(COPY.emptyRecent)}</p>
        )}
      </Accordion>

      <div className="accv2-footer-bar">
        <span>{l(COPY.footerNote)}</span>
        <span>{l(COPY.lastUpdated)}: {new Date().toLocaleTimeString(locale === 'ar' ? 'ar' : undefined)}</span>
      </div>
    </div>
  );
}
