// apps/owner-center/src/pages/oil-analysis/DashboardScreen.tsx
// OA-006 Oil Analysis Dashboard — operational command center.

import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { usePlatformSdk } from '../../context/SdkContext';
import {
  CardList,
  DataTable,
  ErrorState,
  FilterBar,
  KpiCard,
  KpiGrid,
  PageHeader,
  SectionCard,
  StatusBadge,
  useIsMobile,
} from '../../components/ui';
import type {
  CardListField,
  DataTableColumn,
  FilterFieldConfig,
  HealthSeverity,
  StatusBadgeVariant,
} from '../../components/ui';
import { resolveOilAnalysisContractorScope } from '../../modules/oil-analysis/contractor-scope';
import { isApprovalWorkflowEnabled } from '../../modules/oil-analysis/settings-guards';
import {
  oilAnalysisDashboardService,
  type ContractorComparisonBar,
  type DashboardFilterParams,
  type HealthDistributionSlice,
  type ImmediateAttentionRow,
  type MonthlySamplePoint,
  type RecentActivityItem,
  type ReviewQueueItem,
} from '../../modules/oil-analysis/dashboard.service';

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

const COPY = {
  title: { en: 'Oil Analysis Dashboard', ar: 'لوحة تحليل الزيت' },
  subtitle: {
    en: 'What requires your attention today?',
    ar: 'ما الذي يتطلب انتباهك اليوم؟',
  },
  search: { en: 'Search LP, equipment, area…', ar: 'ابحث عن نقطة التشحيم أو المعدة أو المنطقة…' },
  filterLp: { en: 'LP_ID', ar: 'LP_ID' },
  filterArea: { en: 'Area', ar: 'المنطقة' },
  filterContractor: { en: 'Contractor', ar: 'المقاول' },
  filterOilType: { en: 'Oil Type', ar: 'نوع الزيت' },
  filterStatus: { en: 'Status', ar: 'الحالة' },
  filterDate: { en: 'Date', ar: 'التاريخ' },
  filterAll: { en: 'All', ar: 'الكل' },
  clearFilters: { en: 'Clear filters', ar: 'مسح الفلاتر' },
  kpiTotalSampling: { en: 'Total LPs with Sampling', ar: 'إجمالي نقاط التشحيم مع عينات' },
  kpiAlertEquip: { en: 'Alert Equipment', ar: 'معدات تنبيه' },
  kpiCautionEquip: { en: 'Caution Equipment', ar: 'معدات حذر' },
  kpiNormalEquip: { en: 'Normal Equipment', ar: 'معدات طبيعية' },
  kpiDueToday: { en: 'Samples Due Today', ar: 'عينات مستحقة اليوم' },
  kpiOverdue: { en: 'Overdue Samples', ar: 'عينات متأخرة' },
  kpiPendingReview: { en: 'Pending Review', ar: 'بانتظار المراجعة' },
  kpiPendingApproval: { en: 'Pending Approval', ar: 'بانتظار الاعتماد' },
  kpiOpenActions: { en: 'Open Actions', ar: 'إجراءات مفتوحة' },
  secImmediate: { en: 'Equipment Requiring Immediate Attention', ar: 'معدات تتطلب اهتماماً فورياً' },
  secNeedsReview: { en: 'Needs Review', ar: 'تحتاج مراجعة' },
  secRecent: { en: 'Recent Activity', ar: 'النشاط الأخير' },
  secCharts: { en: 'Analytics', ar: 'التحليلات' },
  secPriorities: { en: "Today's Priorities", ar: 'أولويات اليوم' },
  chartHealth: { en: 'Equipment Health Distribution', ar: 'توزيع صحة المعدات' },
  chartTrend: { en: 'Monthly Sample Trend', ar: 'اتجاه العينات الشهري' },
  chartContractor: { en: 'Contractor Comparison', ar: 'مقارنة المقاولين' },
  chartOilType: { en: 'Oil Type Distribution', ar: 'توزيع أنواع الزيت' },
  colLp: { en: 'LP_ID', ar: 'LP_ID' },
  colReportStatus: { en: 'Report Status', ar: 'حالة التقرير' },
  colLastAction: { en: 'Last Action', ar: 'آخر إجراء' },
  emptyAttention: { en: 'No equipment requires immediate attention.', ar: 'لا توجد معدات تتطلب اهتماماً فورياً.' },
  emptyRecent: { en: 'No recent activity in scope.', ar: 'لا يوجد نشاط حديث ضمن النطاق.' },
  emptyCharts: { en: 'Insufficient data for charts.', ar: 'بيانات غير كافية للمخططات.' },
  errorLoad: { en: 'Unable to load dashboard.', ar: 'تعذر تحميل لوحة المعلومات.' },
  statusNormal: { en: 'Normal', ar: 'طبيعي' },
  statusCaution: { en: 'Caution', ar: 'حذر' },
  statusAlert: { en: 'Alert', ar: 'تنبيه' },
  statusPending: { en: 'Pending', ar: 'قيد الانتظار' },
  statusNone: { en: 'No sample', ar: 'لا توجد عينة' },
  statusOverdue: { en: 'Overdue', ar: 'متأخر' },
  activitySample: { en: 'Imported sample', ar: 'عينة مستوردة' },
  activityAction: { en: 'Action', ar: 'إجراء' },
  activityOilChange: { en: 'Oil change', ar: 'تغيير زيت' },
  activityComment: { en: 'Comment', ar: 'تعليق' },
} as const;

const STATUS_FILTER_OPTIONS: ReadonlyArray<{ value: string; label: L10n<string> }> = [
  { value: 'normal', label: COPY.statusNormal },
  { value: 'caution', label: COPY.statusCaution },
  { value: 'alert', label: COPY.statusAlert },
  { value: 'pending', label: COPY.statusPending },
  { value: 'none', label: COPY.statusNone },
  { value: 'overdue', label: COPY.statusOverdue },
];

const HEALTH_COLORS: Record<string, string> = {
  alert: 'var(--acc-color-alert, #dc2626)',
  caution: 'var(--acc-color-caution, #d97706)',
  overdue: 'var(--acc-color-warning, #ca8a04)',
  pending: 'var(--acc-color-pending, #6366f1)',
  normal: 'var(--acc-color-normal, #16a34a)',
  none: 'var(--acc-color-muted, #94a3b8)',
};

function kpiSeverity(value: number, warnAbove = 0): HealthSeverity {
  if (value <= warnAbove) return 'info';
  if (value < 5) return 'caution';
  return 'critical';
}

function attentionBadge(reason: ImmediateAttentionRow['reason']): {
  variant: StatusBadgeVariant;
  label: string;
} {
  switch (reason) {
    case 'alert':
    case 'shutdown':
      return { variant: 'alert', label: 'Alert' };
    case 'caution':
      return { variant: 'caution', label: 'Caution' };
    case 'overdue':
      return { variant: 'overdue', label: 'Overdue' };
    default:
      return { variant: 'disabled', label: '—' };
  }
}

function activityKindLabel(kind: RecentActivityItem['kind'], locale: string): string {
  const map: Record<RecentActivityItem['kind'], L10n<string>> = {
    sample: COPY.activitySample,
    action: COPY.activityAction,
    'oil-change': COPY.activityOilChange,
    comment: COPY.activityComment,
  };
  return t(map[kind], locale);
}

interface BarChartProps {
  readonly title: string;
  readonly labels: readonly string[];
  readonly values: readonly number[];
  readonly colors?: readonly string[];
}

function SimpleBarChart({ title, labels, values, colors }: BarChartProps): React.ReactElement {
  const max = Math.max(...values, 1);
  const width = 320;
  const height = 180;
  const pad = { top: 16, right: 12, bottom: 36, left: 12 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const barW = innerW / Math.max(labels.length, 1) - 8;

  return (
    <div className="acc-oa-dashboard__chart">
      <h3 className="acc-oa-dashboard__chart-title">{title}</h3>
      {values.every((v) => v === 0) ? (
        <p className="acc-oa-dashboard__chart-empty">—</p>
      ) : (
        <svg
          className="acc-oa-dashboard__chart-svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={title}
        >
          {labels.map((label, i) => {
            const value = values[i] ?? 0;
            const barH = (value / max) * innerH;
            const x = pad.left + i * (barW + 8);
            const y = pad.top + innerH - barH;
            const fill = colors?.[i] ?? 'var(--acc-color-primary, #2563eb)';
            return (
              <g key={label}>
                <rect x={x} y={y} width={barW} height={barH} rx={3} fill={fill} />
                <text
                  x={x + barW / 2}
                  y={height - 8}
                  className="acc-oa-dashboard__chart-label"
                  textAnchor="middle"
                >
                  {label.length > 8 ? `${label.slice(0, 7)}…` : label}
                </text>
                {value > 0 && (
                  <text
                    x={x + barW / 2}
                    y={y - 4}
                    className="acc-oa-dashboard__chart-value"
                    textAnchor="middle"
                  >
                    {value}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

interface DonutChartProps {
  readonly title: string;
  readonly slices: readonly { label: string; value: number; color: string }[];
}

function SimpleDonutChart({ title, slices }: DonutChartProps): React.ReactElement {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const size = 160;
  const r = 56;
  const cx = size / 2;
  const cy = size / 2;
  let angle = -90;

  const arcs = slices.map((slice) => {
    const sweep = total > 0 ? (slice.value / total) * 360 : 0;
    const start = angle;
    angle += sweep;
    const startRad = (start * Math.PI) / 180;
    const endRad = ((start + sweep) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const large = sweep > 180 ? 1 : 0;
    const d =
      sweep <= 0
        ? ''
        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return { ...slice, d };
  });

  return (
    <div className="acc-oa-dashboard__chart">
      <h3 className="acc-oa-dashboard__chart-title">{title}</h3>
      {total === 0 ? (
        <p className="acc-oa-dashboard__chart-empty">—</p>
      ) : (
        <>
          <svg
            className="acc-oa-dashboard__chart-svg acc-oa-dashboard__chart-svg--donut"
            viewBox={`0 0 ${size} ${size}`}
            role="img"
            aria-label={title}
          >
            {arcs.map((arc) =>
              arc.d ? <path key={arc.label} d={arc.d} fill={arc.color} /> : null,
            )}
            <circle cx={cx} cy={cy} r={r * 0.55} fill="var(--acc-surface, #fff)" />
            <text x={cx} y={cy + 4} className="acc-oa-dashboard__chart-center" textAnchor="middle">
              {total}
            </text>
          </svg>
          <ul className="acc-oa-dashboard__chart-legend">
            {slices.map((slice) => (
              <li key={slice.label}>
                <span className="acc-oa-dashboard__legend-swatch" style={{ background: slice.color }} />
                {slice.label} ({slice.value})
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ContractorComparisonChart({
  title,
  bars,
}: {
  readonly title: string;
  readonly bars: readonly ContractorComparisonBar[];
}): React.ReactElement {
  const labels = bars.map((b) => b.contractorId);
  const alertValues = bars.map((b) => b.alert);
  const cautionValues = bars.map((b) => b.caution);
  const normalValues = bars.map((b) => b.normal);

  const max = Math.max(...alertValues, ...cautionValues, ...normalValues, 1);
  const width = 320;
  const height = 200;
  const pad = { top: 16, right: 12, bottom: 40, left: 12 };
  const groupW = (width - pad.left - pad.right) / Math.max(bars.length, 1);
  const barW = Math.min(14, groupW / 4);

  return (
    <div className="acc-oa-dashboard__chart">
      <h3 className="acc-oa-dashboard__chart-title">{title}</h3>
      {bars.length === 0 ? (
        <p className="acc-oa-dashboard__chart-empty">—</p>
      ) : (
        <>
          <svg
            className="acc-oa-dashboard__chart-svg"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={title}
          >
            {bars.map((bar, i) => {
              const gx = pad.left + i * groupW + groupW / 2;
              const series = [
                { value: bar.alert, color: HEALTH_COLORS.alert },
                { value: bar.caution, color: HEALTH_COLORS.caution },
                { value: bar.normal, color: HEALTH_COLORS.normal },
              ];
              return (
                <g key={bar.contractorId}>
                  {series.map((s, j) => {
                    const h = (s.value / max) * (height - pad.top - pad.bottom);
                    const x = gx - barW * 1.5 + j * (barW + 2);
                    const y = height - pad.bottom - h;
                    return (
                      <rect
                        key={j}
                        x={x}
                        y={y}
                        width={barW}
                        height={h}
                        rx={2}
                        fill={s.color}
                      />
                    );
                  })}
                  <text
                    x={gx}
                    y={height - 10}
                    className="acc-oa-dashboard__chart-label"
                    textAnchor="middle"
                  >
                    {bar.contractorId}
                  </text>
                </g>
              );
            })}
          </svg>
          <ul className="acc-oa-dashboard__chart-legend acc-oa-dashboard__chart-legend--inline">
            <li><span style={{ background: HEALTH_COLORS.alert }} className="acc-oa-dashboard__legend-swatch" />Alert</li>
            <li><span style={{ background: HEALTH_COLORS.caution }} className="acc-oa-dashboard__legend-swatch" />Caution</li>
            <li><span style={{ background: HEALTH_COLORS.normal }} className="acc-oa-dashboard__legend-swatch" />Normal</li>
          </ul>
        </>
      )}
    </div>
  );
}

function healthLabel(slice: HealthDistributionSlice, locale: string): string {
  const map: Record<string, L10n<string>> = {
    alert: COPY.statusAlert,
    caution: COPY.statusCaution,
    normal: COPY.statusNormal,
    pending: COPY.statusPending,
    none: COPY.statusNone,
    overdue: COPY.statusOverdue,
  };
  return t(map[slice.status] ?? COPY.statusNone, locale);
}

export default function DashboardScreen(): React.ReactElement {
  const { locale } = useLanguage();
  const l = useCallback((bundle: L10n<string>) => t(bundle, locale), [locale]);
  const sdk = usePlatformSdk();
  const { status: authStatus, user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [search, setSearch] = useState('');
  const [lpId, setLpId] = useState('');
  const [area, setArea] = useState('');
  const [contractor, setContractor] = useState('');
  const [oilType, setOilType] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const contractorScope = useMemo(
    () => resolveOilAnalysisContractorScope(sdk),
    [sdk],
  );

  const filterParams = useMemo<DashboardFilterParams>(
    () => ({
      search,
      lpId: lpId || undefined,
      area: area || undefined,
      contractor: contractor || undefined,
      oilType: oilType || undefined,
      status: status || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [search, lpId, area, contractor, oilType, status, dateFrom, dateTo],
  );

  const dashboardData = useMemo(() => {
    if (authStatus !== 'authenticated') {
      return { view: null as ReturnType<typeof oilAnalysisDashboardService.load> | null, error: null as string | null };
    }
    try {
      const filterOptions = oilAnalysisDashboardService.getFilterOptions(contractorScope);
      const view = oilAnalysisDashboardService.load(
        contractorScope,
        filterParams,
        locale,
        user?.displayName ?? '',
      );
      return { view, filterOptions, error: null as string | null };
    } catch (err) {
      return {
        view: null,
        filterOptions: { lpIds: [], areas: [], contractors: [], oilTypes: [] },
        error: err instanceof Error ? err.message : 'Load failed',
      };
    }
  }, [authStatus, contractorScope, filterParams, locale, user?.displayName]);

  const { view, filterOptions, error } = dashboardData as {
    view: ReturnType<typeof oilAnalysisDashboardService.load> | null;
    filterOptions: ReturnType<typeof oilAnalysisDashboardService.getFilterOptions>;
    error: string | null;
  };

  const activeFilterCount = [lpId, area, contractor, oilType, status, dateFrom, dateTo].filter(Boolean).length;

  const filters: FilterFieldConfig[] = useMemo(() => {
    const fields: FilterFieldConfig[] = [
      {
        id: 'lpId',
        label: l(COPY.filterLp),
        type: 'select',
        value: lpId,
        placeholder: l(COPY.filterAll),
        options: filterOptions.lpIds.map((value) => ({ value, label: value })),
      },
      {
        id: 'area',
        label: l(COPY.filterArea),
        type: 'select',
        value: area,
        placeholder: l(COPY.filterAll),
        options: filterOptions.areas.map((value) => ({ value, label: value })),
      },
      {
        id: 'oilType',
        label: l(COPY.filterOilType),
        type: 'select',
        value: oilType,
        placeholder: l(COPY.filterAll),
        options: filterOptions.oilTypes.map((value) => ({ value, label: value })),
      },
      {
        id: 'status',
        label: l(COPY.filterStatus),
        type: 'select',
        value: status,
        placeholder: l(COPY.filterAll),
        options: STATUS_FILTER_OPTIONS.map((opt) => ({
          value: opt.value,
          label: l(opt.label),
        })),
      },
      {
        id: 'date',
        label: l(COPY.filterDate),
        type: 'date-range',
        valueFrom: dateFrom,
        valueTo: dateTo,
      },
    ];

    if (contractorScope.canViewAllContractors) {
      fields.splice(2, 0, {
        id: 'contractor',
        label: l(COPY.filterContractor),
        type: 'select',
        value: contractor,
        placeholder: l(COPY.filterAll),
        options: filterOptions.contractors.map((value) => ({ value, label: value })),
      });
    }

    return fields;
  }, [
    area,
    contractor,
    contractorScope.canViewAllContractors,
    dateFrom,
    dateTo,
    filterOptions,
    l,
    lpId,
    oilType,
    status,
  ]);

  const handleClearFilters = (): void => {
    setSearch('');
    setLpId('');
    setArea('');
    if (contractorScope.canViewAllContractors) setContractor('');
    setOilType('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
  };

  const handleFilterChange = (id: string, value: string): void => {
    switch (id) {
      case 'lpId': setLpId(value); break;
      case 'area': setArea(value); break;
      case 'contractor': setContractor(value); break;
      case 'oilType': setOilType(value); break;
      case 'status': setStatus(value); break;
      default: break;
    }
  };

  const openEquipment = (equipmentId: string, lp?: string): void => {
    const qs = lp ? `?lp=${encodeURIComponent(lp)}` : '';
    navigate(`/oil-analysis/equipment/${encodeURIComponent(equipmentId)}${qs}`);
  };

  const attentionColumns: DataTableColumn<ImmediateAttentionRow>[] = useMemo(
    () => [
      { id: 'lpId', header: l(COPY.colLp), accessor: 'lpId', sortable: true },
      {
        id: 'reportStatus',
        header: l(COPY.colReportStatus),
        accessor: 'reportStatus',
        sortable: true,
      },
      {
        id: 'lastAction',
        header: l(COPY.colLastAction),
        renderCell: (row) => (
          <span className="acc-oa-dashboard__action-cell" title={row.lastAction}>
            {row.lastAction}
          </span>
        ),
      },
    ],
    [l],
  );

  const attentionCardFields: CardListField<ImmediateAttentionRow>[] = useMemo(
    () => [
      { id: 'lpId', label: l(COPY.colLp), render: (row) => row.lpId, emphasize: true },
      { id: 'reportStatus', label: l(COPY.colReportStatus), render: (row) => row.reportStatus },
      { id: 'lastAction', label: l(COPY.colLastAction), render: (row) => row.lastAction },
    ],
    [l],
  );

  const renderReviewItem = (item: ReviewQueueItem): React.ReactElement => (
    <button
      key={item.id}
      type="button"
      className="acc-oa-dashboard__review-item"
      onClick={() => navigate(item.route)}
    >
      <span className="acc-oa-dashboard__review-label">{item.label}</span>
      <StatusBadge
        variant={item.count > 0 ? 'pending-review' : 'normal'}
        label={String(item.count)}
        size="sm"
      />
    </button>
  );

  const renderActivityItem = (item: RecentActivityItem): React.ReactElement => (
    <li key={item.id} className="acc-oa-dashboard__activity-item">
      <div className="acc-oa-dashboard__activity-head">
        <StatusBadge variant="info" label={activityKindLabel(item.kind, locale)} size="sm" />
        <time className="acc-oa-dashboard__activity-date" dateTime={item.isoDate}>
          {item.isoDate}
        </time>
      </div>
      <button
        type="button"
        className="acc-oa-dashboard__activity-link"
        onClick={() => item.route && navigate(item.route)}
        disabled={!item.route}
      >
        <span className="acc-oa-dashboard__activity-title">{item.title}</span>
        <span className="acc-oa-dashboard__activity-sub">{item.subtitle}</span>
      </button>
    </li>
  );

  if (error) {
    return <ErrorState title={l(COPY.errorLoad)} message={error} />;
  }

  const kpis = view?.kpis;
  const charts = view?.charts;

  const healthSlices = (charts?.healthDistribution ?? []).map((slice) => ({
    label: healthLabel(slice, locale),
    value: slice.count,
    color: HEALTH_COLORS[slice.status] ?? HEALTH_COLORS.none,
  }));

  const trendPoints = charts?.monthlySampleTrend ?? [];
  const oilTypeSlices = [...(charts?.oilTypeDistribution ?? [])];

  return (
    <div className="acc-oa-dashboard">
      <PageHeader title={l(COPY.title)} subtitle={l(COPY.subtitle)} />

      {view && (
        <SectionCard
          title={view.priorities.greeting}
          subtitle={l(COPY.secPriorities)}
          className="acc-oa-dashboard__priorities"
          bodyClassName="acc-oa-dashboard__priorities-body"
        >
          <ul className="acc-oa-dashboard__priority-list">
            {view.priorities.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </SectionCard>
      )}

      <FilterBar
        searchValue={search}
        searchPlaceholder={l(COPY.search)}
        onSearchChange={setSearch}
        filters={filters}
        onFilterChange={handleFilterChange}
        onDateFromChange={(_id, value) => setDateFrom(value)}
        onDateToChange={(_id, value) => setDateTo(value)}
        onClear={handleClearFilters}
        clearLabel={l(COPY.clearFilters)}
        activeFilterCount={activeFilterCount}
        className="acc-oa-dashboard__filters"
      />

      {kpis && (
        <KpiGrid desktopColumns={8} className="acc-oa-dashboard__kpis">
          <KpiCard value={kpis.totalLpsWithSampling} label={l(COPY.kpiTotalSampling)} severity="info" />
          <KpiCard
            value={kpis.alertEquipment}
            label={l(COPY.kpiAlertEquip)}
            severity={kpiSeverity(kpis.alertEquipment)}
          />
          <KpiCard
            value={kpis.cautionEquipment}
            label={l(COPY.kpiCautionEquip)}
            severity={kpiSeverity(kpis.cautionEquipment)}
          />
          <KpiCard value={kpis.normalEquipment} label={l(COPY.kpiNormalEquip)} severity="normal" />
          <KpiCard
            value={kpis.samplesDueToday}
            label={l(COPY.kpiDueToday)}
            severity={kpiSeverity(kpis.samplesDueToday)}
          />
          <KpiCard
            value={kpis.overdueSamples}
            label={l(COPY.kpiOverdue)}
            severity={kpiSeverity(kpis.overdueSamples)}
          />
          <KpiCard
            value={kpis.pendingReview}
            label={l(COPY.kpiPendingReview)}
            severity={kpiSeverity(kpis.pendingReview)}
          />
          {isApprovalWorkflowEnabled() && (
            <KpiCard
              value={kpis.pendingApproval}
              label={l(COPY.kpiPendingApproval)}
              severity={kpiSeverity(kpis.pendingApproval)}
            />
          )}
          <KpiCard
            value={kpis.openActions}
            label={l(COPY.kpiOpenActions)}
            severity={kpiSeverity(kpis.openActions)}
          />
        </KpiGrid>
      )}

      <SectionCard
        title={l(COPY.secImmediate)}
        className="acc-oa-dashboard__attention"
        empty={!view || view.immediateAttention.length === 0}
        emptyTitle={l(COPY.emptyAttention)}
      >
        {view && view.immediateAttention.length > 0 && (
          isMobile ? (
            <CardList
              items={[...view.immediateAttention]}
              fields={attentionCardFields}
              getStatus={(row) => attentionBadge(row.reason)}
              onItemClick={(row) => openEquipment(row.equipmentId, row.lpId)}
            />
          ) : (
            <DataTable
              columns={attentionColumns}
              data={[...view.immediateAttention]}
              onRowClick={(row) => openEquipment(row.equipmentId, row.lpId)}
              getRowStatus={(row) => attentionBadge(row.reason)}
              stickyHeader
            />
          )
        )}
      </SectionCard>

      <div className="acc-oa-dashboard__zones">
        <SectionCard title={l(COPY.secNeedsReview)} className="acc-oa-dashboard__zone">
          {view && (
            <div className="acc-oa-dashboard__review-list">
              {view.needsReview.map(renderReviewItem)}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={l(COPY.secRecent)}
          className="acc-oa-dashboard__zone"
          empty={!view || view.recentActivity.length === 0}
          emptyTitle={l(COPY.emptyRecent)}
        >
          {view && view.recentActivity.length > 0 && (
            <ul className="acc-oa-dashboard__activity-list" role="list">
              {view.recentActivity.map(renderActivityItem)}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title={l(COPY.secCharts)} className="acc-oa-dashboard__charts-section">
        {charts ? (
          <div className="acc-oa-dashboard__charts">
            <SimpleDonutChart title={l(COPY.chartHealth)} slices={healthSlices} />
            <SimpleBarChart
              title={l(COPY.chartTrend)}
              labels={trendPoints.map((p: MonthlySamplePoint) => p.label)}
              values={trendPoints.map((p) => p.count)}
            />
            <ContractorComparisonChart
              title={l(COPY.chartContractor)}
              bars={charts.contractorComparison}
            />
            <SimpleBarChart
              title={l(COPY.chartOilType)}
              labels={oilTypeSlices.map((s) => s.oilType)}
              values={oilTypeSlices.map((s) => s.count)}
            />
          </div>
        ) : (
          <p className="acc-oa-dashboard__chart-empty">{l(COPY.emptyCharts)}</p>
        )}
      </SectionCard>
    </div>
  );
}
