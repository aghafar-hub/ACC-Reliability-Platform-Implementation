// apps/owner-center/src/pages/oil-analysis/EquipmentDetails.tsx
// OA-002 Equipment Details — digital equipment passport for one Equipment_ID.

import React, { useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { usePlatformSdk } from '../../context/SdkContext';
import {
  ActionCard,
  DataTable,
  EmptyState,
  ErrorState,
  KpiCard,
  KpiGrid,
  PageHeader,
  SectionCard,
  StatusBadge,
  Timeline,
  useIsMobile,
} from '../../components/ui';
import type { DataTableColumn, StatusBadgeVariant, TimelineEvent } from '../../components/ui';
import { OilAnalysisActionButton } from '../../components/oil-analysis/OilAnalysisActionButton';
import { useOilAnalysisPermissions } from '../../hooks/useOilAnalysisPermissions';
import { resolveOilAnalysisContractorScope } from '../../modules/oil-analysis/contractor-scope';
import {
  equipmentDetailsService,
  type EquipmentDetailsView,
  type HistoricalSampleRow,
} from '../../modules/oil-analysis/equipment-details.service';
import {
  registerStatusBadge,
  type LpRegisterConditionStatus,
} from '../../modules/oil-analysis/lp-register.service';
import { getOilTrendParameter } from '../../modules/oil-analysis/trend.service';
import type { TrendAnalysisResult } from '../../modules/trend-engine';

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

const COPY = {
  title: { en: 'Equipment Details', ar: 'تفاصيل المعدة' },
  subtitle: {
    en: 'Digital equipment passport — oil analysis health for all lubrication points.',
    ar: 'جواز المعدة الرقمي — صحة تحليل الزيت لجميع نقاط التشحيم.',
  },
  breadcrumbModule: { en: 'Oil Analysis', ar: 'تحليل الزيت' },
  breadcrumbRegister: { en: 'Equipment & LP Register', ar: 'سجل المعدات ونقاط التشحيم' },
  metaEquipmentId: { en: 'Equipment ID', ar: 'معرّف المعدة' },
  metaArea: { en: 'Area', ar: 'المنطقة' },
  metaContractor: { en: 'Contractor', ar: 'المقاول' },
  metaAssetClass: { en: 'Asset Class', ar: 'فئة الأصل' },
  metaCriticality: { en: 'Criticality', ar: 'الأهمية' },
  metaOilType: { en: 'Oil Type', ar: 'نوع الزيت' },
  metaOilQty: { en: 'Oil Quantity', ar: 'كمية الزيت' },
  actionAddSample: { en: 'Add Sample', ar: 'إضافة عينة' },
  actionLatestReport: { en: 'Latest Report', ar: 'أحدث تقرير' },
  actionExportPdf: { en: 'Export PDF', ar: 'تصدير PDF' },
  actionCreateAction: { en: 'Create Action', ar: 'إنشاء إجراء' },
  sectionLp: { en: 'Lubrication Points', ar: 'نقاط التشحيم' },
  sectionLatest: { en: 'Latest Sample Summary', ar: 'ملخص آخر عينة' },
  sectionTimeline: { en: 'Sample Timeline', ar: 'الجدول الزمني للعينات' },
  sectionTrends: { en: 'Laboratory Trends', ar: 'اتجاهات المختبر' },
  sectionRecommendations: { en: 'Recommendations', ar: 'التوصيات' },
  sectionLastAction: { en: 'Last Action Status', ar: 'حالة آخر إجراء' },
  sectionOilChange: { en: 'Oil Change History', ar: 'سجل تغيير الزيت' },
  sectionHistory: { en: 'Historical Samples', ar: 'العينات التاريخية' },
  kpiSampleDate: { en: 'Sample Date', ar: 'تاريخ العينة' },
  kpiReportStatus: { en: 'Report Status', ar: 'حالة التقرير' },
  kpiEquipRating: { en: 'Equipment Rating', ar: 'تقييم المعدة' },
  kpiLubRating: { en: 'Lubricant Rating', ar: 'تقييم المزلق' },
  kpiContamRating: { en: 'Contamination Rating', ar: 'تقييم التلوث' },
  kpiOilType: { en: 'Oil Type', ar: 'نوع الزيت' },
  kpiNextSample: { en: 'Next Sample Date', ar: 'تاريخ العينة القادمة' },
  emptyRecommendations: { en: 'No laboratory recommendations for this LP.', ar: 'لا توجد توصيات مختبرية لهذه النقطة.' },
  emptyLastAction: { en: 'No related action recorded.', ar: 'لا يوجد إجراء مرتبط مسجّل.' },
  emptyOilChange: { en: 'No oil change history for this LP.', ar: 'لا يوجد سجل تغيير زيت لهذه النقطة.' },
  emptyHistory: { en: 'No historical samples for this LP.', ar: 'لا توجد عينات تاريخية لهذه النقطة.' },
  emptyTrend: { en: 'Insufficient approved samples for trend preview.', ar: 'عينات معتمدة غير كافية لمعاينة الاتجاه.' },
  notFound: { en: 'Equipment not found or not in your contractor scope.', ar: 'المعدة غير موجودة أو خارج نطاق المقاول.' },
  forbidden: { en: 'You do not have access to this equipment.', ar: 'ليس لديك صلاحية الوصول إلى هذه المعدة.' },
  colSample: { en: 'Sample', ar: 'العينة' },
  colLabId: { en: 'Lab Sample ID', ar: 'معرّف عينة المختبر' },
  colDate: { en: 'Date', ar: 'التاريخ' },
  colCondition: { en: 'Condition', ar: 'الحالة' },
  colReport: { en: 'Report Status', ar: 'حالة التقرير' },
  colOilChangeDate: { en: 'Performed', ar: 'تاريخ التنفيذ' },
  colOilType: { en: 'Oil Type', ar: 'نوع الزيت' },
  colQuantity: { en: 'Quantity (L)', ar: 'الكمية (لتر)' },
  colTechnician: { en: 'Technician', ar: 'الفني' },
  colOcStatus: { en: 'Status', ar: 'الحالة' },
  trendPreviewNote: { en: 'Iron (ppm) — preview', ar: 'الحديد (ppm) — معاينة' },
  createActionSoon: { en: 'Actions screen (OA-005) coming soon', ar: 'شاشة الإجراءات (OA-005) قريباً' },
  noPdf: { en: 'No original PDF linked to latest sample', ar: 'لا يوجد PDF أصلي مرتبط بآخر عينة' },
} as const;

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusLabel(status: LpRegisterConditionStatus, locale: string): string {
  const map: Record<LpRegisterConditionStatus, L10n<string>> = {
    normal: { en: 'Normal', ar: 'طبيعي' },
    caution: { en: 'Caution', ar: 'حذر' },
    alert: { en: 'Alert', ar: 'تنبيه' },
    pending: { en: 'Pending', ar: 'قيد الانتظار' },
    none: { en: 'No sample', ar: 'لا توجد عينة' },
  };
  return t(map[status], locale);
}

function conditionLabel(condition: HistoricalSampleRow['condition'], locale: string): string {
  const map: Record<HistoricalSampleRow['condition'], L10n<string>> = {
    normal: { en: 'Normal', ar: 'طبيعي' },
    monitor: { en: 'Monitor', ar: 'مراقبة' },
    caution: { en: 'Caution', ar: 'حذر' },
    critical: { en: 'Critical', ar: 'حرج' },
    pending: { en: 'Pending', ar: 'قيد الانتظار' },
  };
  return t(map[condition], locale);
}

function conditionBadgeVariant(
  condition: HistoricalSampleRow['condition'],
): StatusBadgeVariant {
  switch (condition) {
    case 'critical':
      return 'alert';
    case 'caution':
    case 'monitor':
      return 'caution';
    case 'normal':
      return 'normal';
    default:
      return 'pending-review';
  }
}

function formatNumber(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

interface TrendPreviewChartProps {
  readonly analysis: TrendAnalysisResult;
  readonly unit: string;
}

function TrendPreviewChart({ analysis, unit }: TrendPreviewChartProps): React.ReactElement {
  const points = analysis.points;
  const width = 640;
  const height = 160;
  const pad = { top: 12, right: 12, bottom: 24, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  if (points.length === 0) {
    return <div className="acc-oa-equipment__trend-empty">—</div>;
  }

  const values = points.map((p) => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const span = maxV - minV || 1;
  const yMin = minV - span * 0.1;
  const yMax = maxV + span * 0.1;
  const xAt = (index: number) => pad.left + (index / Math.max(points.length - 1, 1)) * innerW;
  const yAt = (value: number) => pad.top + innerH - ((value - yMin) / (yMax - yMin)) * innerH;
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(p.value).toFixed(1)}`)
    .join(' ');

  return (
    <div className="acc-oa-equipment__trend-chart">
      <svg
        className="oa-trend-chart__svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Laboratory trend preview"
      >
        <path d={linePath} className="oa-trend-chart__line" fill="none" />
        {points.map((p, i) => (
          <circle
            key={`${p.at}-${i}`}
            cx={xAt(i)}
            cy={yAt(p.value)}
            r={4}
            className="oa-trend-chart__dot"
          />
        ))}
        <text x={width - pad.right} y={height - 6} className="oa-trend-chart__unit" textAnchor="end">
          {unit}
        </text>
      </svg>
    </div>
  );
}

export default function EquipmentDetails(): React.ReactElement {
  const { locale } = useLanguage();
  const l = useCallback((bundle: L10n<string>) => t(bundle, locale), [locale]);
  const { equipmentId = '' } = useParams<{ equipmentId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const sdk = usePlatformSdk();
  const { status: authStatus } = useAuth();
  const permissions = useOilAnalysisPermissions();

  const requestedLp = searchParams.get('lp') ?? '';

  const contractorScope = useMemo(
    () => resolveOilAnalysisContractorScope(sdk),
    [sdk],
  );

  const pageResult = useMemo(() => {
    if (authStatus !== 'authenticated') return { kind: 'loading' as const };
    return equipmentDetailsService.load(equipmentId, contractorScope, requestedLp || undefined);
  }, [authStatus, contractorScope, equipmentId, requestedLp]);

  const selectLp = (lpId: string): void => {
    const next = new URLSearchParams(searchParams);
    next.set('lp', lpId);
    setSearchParams(next, { replace: true });
  };

  const openSampleReport = (
    lpId: string,
    sampleInternalId?: string | null,
  ): void => {
    const params = new URLSearchParams({
      equipment: equipmentId,
      lp: lpId,
    });
    if (sampleInternalId) params.set('sample', sampleInternalId);
    navigate(`/oil-analysis/sample-report?${params.toString()}`);
  };

  const openAddSample = (lpId: string): void => {
    navigate(`/oil-analysis/add-sample?equipment=${encodeURIComponent(equipmentId)}&lp=${encodeURIComponent(lpId)}`);
  };

  const handleExportPdf = (data: EquipmentDetailsView): void => {
    const url = data.lpView.latestSample.pdfFileUrl;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    window.alert(l(COPY.noPdf));
  };

  if (pageResult.kind === 'loading') {
    return (
      <div className="acc-oa-page acc-oa-equipment">
        <PageHeader title={l(COPY.title)} subtitle={l(COPY.subtitle)} />
        <KpiGrid>
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCard key={i} value="—" label="…" loading />
          ))}
        </KpiGrid>
      </div>
    );
  }

  if (pageResult.kind === 'forbidden') {
    return (
      <ErrorState message={l(COPY.forbidden)} className="acc-oa-page" />
    );
  }

  if (pageResult.kind === 'not-found') {
    return (
      <div className="acc-oa-page acc-oa-equipment">
        <PageHeader
          title={l(COPY.title)}
          breadcrumbs={[
            { label: l(COPY.breadcrumbModule), href: '/oil-analysis' },
            { label: l(COPY.breadcrumbRegister), href: '/oil-analysis/register' },
            { label: l(COPY.title) },
          ]}
        />
        <EmptyState
          title={l(COPY.notFound)}
          action={(
            <Link to="/oil-analysis/register" className="acc-btn acc-btn--secondary">
              {l(COPY.breadcrumbRegister)}
            </Link>
          )}
        />
      </div>
    );
  }

  const { data } = pageResult;
  const { header, lpCards, selectedLpId, lpView } = data;
  const healthBadge = registerStatusBadge(header.overallHealthStatus);
  const trendParam = getOilTrendParameter(lpView.trendParameterId);
  const trendUnit = trendParam.unit;

  const timelineEvents: TimelineEvent[] = equipmentDetailsService
    .buildSampleTimelineEvents(equipmentId, selectedLpId, locale)
    .map((event) => {
      const badge = registerStatusBadge(event.status);
      return {
        id: event.id,
        kind: event.id.startsWith('oc-') ? 'oil-change' : 'sample',
        date: formatDate(event.date),
        label: event.label,
        status: badge.variant as StatusBadgeVariant,
        statusLabel: statusLabel(event.status, locale),
      };
    });

  const historyColumns: DataTableColumn<HistoricalSampleRow>[] = [
    { id: 'sample', header: l(COPY.colSample), accessor: 'sampleCode', sortable: true, sticky: true },
    { id: 'lab', header: l(COPY.colLabId), accessor: 'labSampleId', sortable: true },
    { id: 'date', header: l(COPY.colDate), accessor: (row) => formatDate(row.sampledAt), sortable: true },
    {
      id: 'condition',
      header: l(COPY.colCondition),
      renderCell: (row) => (
        <StatusBadge
          variant={conditionBadgeVariant(row.condition)}
          label={conditionLabel(row.condition, locale)}
          size="sm"
        />
      ),
    },
    { id: 'report', header: l(COPY.colReport), accessor: 'reportStatus' },
  ];

  const quickActions = (
    <>
      <OilAnalysisActionButton
        type="button"
        className="acc-btn acc-btn--secondary"
        allowed={permissions.canCreateSample}
        onClick={() => openAddSample(selectedLpId)}
      >
        {l(COPY.actionAddSample)}
      </OilAnalysisActionButton>
      <button
        type="button"
        className="acc-btn acc-btn--secondary"
        onClick={() => openSampleReport(selectedLpId, lpView.latestSample.sampleInternalId)}
        disabled={!lpView.latestSample.sampleInternalId}
      >
        {l(COPY.actionLatestReport)}
      </button>
      <OilAnalysisActionButton
        type="button"
        className="acc-btn acc-btn--secondary"
        allowed={permissions.canExportReports}
        onClick={() => handleExportPdf(data)}
        disabled={!lpView.latestSample.pdfFileUrl}
      >
        {l(COPY.actionExportPdf)}
      </OilAnalysisActionButton>
      <button
        type="button"
        className="acc-btn acc-btn--secondary"
        title={l(COPY.createActionSoon)}
        disabled
      >
        {l(COPY.actionCreateAction)}
      </button>
    </>
  );

  return (
    <div className="acc-oa-page acc-oa-equipment">
      <PageHeader
        title={header.equipmentName}
        subtitle={`${l(COPY.metaEquipmentId)}: ${header.equipmentId}`}
        breadcrumbs={[
          { label: l(COPY.breadcrumbModule), href: '/oil-analysis' },
          { label: l(COPY.breadcrumbRegister), href: '/oil-analysis/register' },
          { label: header.equipmentName },
        ]}
        status={{
          variant: healthBadge.variant as StatusBadgeVariant,
          label: statusLabel(header.overallHealthStatus, locale),
        }}
        actions={quickActions}
      />

      <dl className="acc-oa-equipment__meta">
        <div className="acc-oa-equipment__meta-item">
          <dt>{l(COPY.metaArea)}</dt>
          <dd>{header.area || '—'}</dd>
        </div>
        <div className="acc-oa-equipment__meta-item">
          <dt>{l(COPY.metaContractor)}</dt>
          <dd>{header.contractorId || '—'}</dd>
        </div>
        <div className="acc-oa-equipment__meta-item">
          <dt>{l(COPY.metaAssetClass)}</dt>
          <dd>{header.assetClass}</dd>
        </div>
        <div className="acc-oa-equipment__meta-item">
          <dt>{l(COPY.metaCriticality)}</dt>
          <dd>{header.criticality}</dd>
        </div>
        <div className="acc-oa-equipment__meta-item">
          <dt>{l(COPY.metaOilType)}</dt>
          <dd>{header.oilType}</dd>
        </div>
        <div className="acc-oa-equipment__meta-item">
          <dt>{l(COPY.metaOilQty)}</dt>
          <dd>{header.oilQuantity}</dd>
        </div>
      </dl>

      <SectionCard title={l(COPY.sectionLp)} bodyClassName="acc-oa-equipment__lp-body">
        <div className="acc-oa-equipment__lp-strip" role="tablist" aria-label={l(COPY.sectionLp)}>
          {lpCards.map((card) => {
            const badge = registerStatusBadge(card.status);
            const selected = card.lpId === selectedLpId;
            return (
              <button
                key={card.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={[
                  'acc-oa-equipment__lp-card',
                  selected ? 'acc-oa-equipment__lp-card--selected' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => selectLp(card.lpId)}
              >
                <span className="acc-oa-equipment__lp-id">{card.lpId}</span>
                <span className="acc-oa-equipment__lp-name">{card.lpName}</span>
                <StatusBadge
                  variant={badge.variant as StatusBadgeVariant}
                  label={statusLabel(card.status, locale)}
                  size="sm"
                />
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title={l(COPY.sectionLatest)}>
        <KpiGrid desktopColumns={6}>
          <KpiCard value={formatDate(lpView.latestSample.sampleDate)} label={l(COPY.kpiSampleDate)} />
          <KpiCard value={lpView.latestSample.reportStatus} label={l(COPY.kpiReportStatus)} severity="info" />
          <KpiCard value={lpView.latestSample.equipmentRating} label={l(COPY.kpiEquipRating)} />
          <KpiCard value={lpView.latestSample.lubricantRating} label={l(COPY.kpiLubRating)} />
          <KpiCard value={lpView.latestSample.contaminationRating} label={l(COPY.kpiContamRating)} />
          <KpiCard value={lpView.latestSample.oilType} label={l(COPY.kpiOilType)} />
          <KpiCard value={formatDate(lpView.latestSample.nextSampleDate)} label={l(COPY.kpiNextSample)} />
        </KpiGrid>
      </SectionCard>

      <div className="acc-oa-equipment__split">
        <SectionCard
          title={l(COPY.sectionTimeline)}
          bodyClassName="acc-oa-equipment__timeline-body"
        >
          <Timeline
            events={timelineEvents}
            direction={isMobile ? 'vertical' : 'horizontal'}
            emptyLabel={l(COPY.emptyHistory)}
            onEventClick={(event) => {
              if (event.kind === 'sample') {
                const sampleId = event.id.replace('sample-', '');
                openSampleReport(selectedLpId, sampleId);
              }
            }}
          />
        </SectionCard>

        <SectionCard
          title={l(COPY.sectionTrends)}
          subtitle={l(COPY.trendPreviewNote)}
          empty={!lpView.trendPreview || lpView.trendPreview.points.length === 0}
          emptyTitle={l(COPY.emptyTrend)}
        >
          {lpView.trendPreview && lpView.trendPreview.points.length > 0 && (
            <TrendPreviewChart analysis={lpView.trendPreview} unit={trendUnit} />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title={l(COPY.sectionRecommendations)}
        empty={!lpView.recommendations}
        emptyTitle={l(COPY.emptyRecommendations)}
      >
        {lpView.recommendations && (
          <p className="acc-oa-equipment__recommendations">{lpView.recommendations}</p>
        )}
      </SectionCard>

      <SectionCard
        title={l(COPY.sectionLastAction)}
        empty={!lpView.lastAction}
        emptyTitle={l(COPY.emptyLastAction)}
      >
        {lpView.lastAction && (
          <ActionCard
            actionNumber={lpView.lastAction.actionNumber}
            lpId={selectedLpId}
            equipment={header.equipmentName}
            status={{
              variant: lpView.lastAction.statusVariant,
              label: lpView.lastAction.statusLabel,
            }}
            lastUpdate={formatDate(lpView.lastAction.lastUpdate)}
          />
        )}
        {lpView.lastAction?.agreedAction && (
          <p className="acc-oa-equipment__action-note">{lpView.lastAction.agreedAction}</p>
        )}
      </SectionCard>

      <SectionCard
        title={l(COPY.sectionOilChange)}
        empty={lpView.oilChangeHistory.length === 0}
        emptyTitle={l(COPY.emptyOilChange)}
      >
        {lpView.oilChangeHistory.length > 0 && (
          <DataTable
            columns={[
              {
                id: 'date',
                header: l(COPY.colOilChangeDate),
                accessor: (row) => formatDate(row.performedAt),
                sortable: true,
              },
              { id: 'oil', header: l(COPY.colOilType), accessor: 'oilTypeUsed' },
              {
                id: 'qty',
                header: l(COPY.colQuantity),
                accessor: (row) => formatNumber(row.quantityUsed, 1),
              },
              { id: 'tech', header: l(COPY.colTechnician), accessor: 'technicianName' },
              { id: 'status', header: l(COPY.colOcStatus), accessor: 'status' },
            ]}
            data={[...lpView.oilChangeHistory]}
          />
        )}
      </SectionCard>

      <SectionCard title={l(COPY.sectionHistory)}>
        {lpView.historicalSamples.length === 0 ? (
          <EmptyState title={l(COPY.emptyHistory)} />
        ) : isMobile ? (
          <div className="acc-card-list">
            {lpView.historicalSamples.map((row) => (
              <button
                key={row.id}
                type="button"
                className="acc-card-list__item-btn acc-oa-equipment__history-card"
                onClick={() => openSampleReport(selectedLpId, row.id)}
              >
                <div className="acc-card-list__header">
                  <StatusBadge
                    variant={conditionBadgeVariant(row.condition)}
                    label={conditionLabel(row.condition, locale)}
                    size="sm"
                  />
                </div>
                <dl className="acc-card-list__fields">
                  <div className="acc-card-list__field acc-card-list__field--emphasize">
                    <dt>{l(COPY.colSample)}</dt>
                    <dd>{row.sampleCode}</dd>
                  </div>
                  <div className="acc-card-list__field">
                    <dt>{l(COPY.colDate)}</dt>
                    <dd>{formatDate(row.sampledAt)}</dd>
                  </div>
                  <div className="acc-card-list__field">
                    <dt>{l(COPY.colReport)}</dt>
                    <dd>{row.reportStatus}</dd>
                  </div>
                </dl>
              </button>
            ))}
          </div>
        ) : (
          <DataTable
            columns={historyColumns}
            data={[...lpView.historicalSamples]}
            onRowClick={(row) => openSampleReport(selectedLpId, row.id)}
            emptyTitle={l(COPY.emptyHistory)}
          />
        )}
      </SectionCard>
    </div>
  );
}
