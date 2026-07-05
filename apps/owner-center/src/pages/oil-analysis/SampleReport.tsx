// apps/owner-center/src/pages/oil-analysis/SampleReport.tsx
// OA-003 Oil Sample Report — engineering lab report for one selected sample.

import React, { useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { usePlatformSdk } from '../../context/SdkContext';
import {
  DataTable,
  EmptyState,
  ErrorState,
  PageHeader,
  ReportLayout,
  ReportPreview,
  ReportSection,
  SectionCard,
  StatusBadge,
  Timeline,
  useIsMobile,
} from '../../components/ui';
import type { DataTableColumn, StatusBadgeVariant, TimelineEvent } from '../../components/ui';
import { resolveOilAnalysisContractorScope } from '../../modules/oil-analysis/contractor-scope';
import { registerStatusBadge } from '../../modules/oil-analysis/lp-register.service';
import {
  sampleReportService,
  type LabCellColor,
  type SampleReportActionRow,
  type SampleReportChartGroup,
  type SampleReportInfoField,
  type SampleReportTrendRow,
  type SampleReportView,
} from '../../modules/oil-analysis/sample-report.service';

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

const COPY = {
  title: { en: 'Oil Sample Report', ar: 'تقرير عينة الزيت' },
  subtitle: {
    en: 'Engineering oil analysis report — laboratory condition and trend context.',
    ar: 'تقرير تحليل الزيت الهندسي — حالة المختبر وسياق الاتجاه.',
  },
  breadcrumbModule: { en: 'Oil Analysis', ar: 'تحليل الزيت' },
  breadcrumbRegister: { en: 'Equipment & LP Register', ar: 'سجل المعدات ونقاط التشحيم' },
  breadcrumbEquipment: { en: 'Equipment Details', ar: 'تفاصيل المعدة' },
  latest: { en: 'Latest', ar: 'الأحدث' },
  samples: { en: 'samples', ar: 'عينات' },
  originalPdf: { en: 'Original PDF', ar: 'PDF الأصلي' },
  noPdf: { en: 'No original PDF linked to this sample', ar: 'لا يوجد PDF أصلي مرتبط بهذه العينة' },
  notFound: {
    en: 'Sample report not found. Check equipment, LP, and sample selection.',
    ar: 'تقرير العينة غير موجود. تحقق من المعدة ونقطة التشحيم والعينة المحددة.',
  },
  forbidden: { en: 'You do not have access to this report.', ar: 'ليس لديك صلاحية الوصول إلى هذا التقرير.' },
  selEquipment: { en: 'Equipment', ar: 'المعدة' },
  selLp: { en: 'Lubrication Point', ar: 'نقطة التشحيم' },
  selSample: { en: 'Sample', ar: 'العينة' },
  oilChangeLast: { en: 'Last Oil Change', ar: 'آخر تغيير زيت' },
  oilChangeType: { en: 'Oil Type', ar: 'نوع الزيت' },
  oilChangeBrand: { en: 'Brand', ar: 'العلامة' },
  oilChangeNext: { en: 'Next Due', ar: 'الاستحقاق القادم' },
  oilChangeBy: { en: 'Performed By', ar: 'نُفذ بواسطة' },
  secAccount: { en: 'Account Information', ar: 'معلومات الحساب' },
  secSample: { en: 'Sample Information', ar: 'معلومات العينة' },
  secEquipment: { en: 'Equipment Information', ar: 'معلومات المعدة' },
  secTrends: { en: 'Sample Data & Trends', ar: 'بيانات العينات والاتجاهات' },
  secCharts: { en: 'Laboratory Charts', ar: 'مخططات المختبر' },
  secRecommendations: { en: 'Recommendations / Comments', ar: 'التوصيات / الملاحظات' },
  secTimeline: { en: 'Sample Timeline', ar: 'الجدول الزمني للعينات' },
  secActions: { en: 'Last 5 Actions', ar: 'آخر 5 إجراءات' },
  emptyRecommendations: { en: 'No laboratory recommendations recorded for this sample.', ar: 'لا توجد توصيات مختبرية مسجلة لهذه العينة.' },
  emptyActions: { en: 'No related actions recorded for this LP.', ar: 'لا توجد إجراءات مرتبطة مسجلة لهذه النقطة.' },
  emptyCharts: { en: 'Insufficient historical values for chart preview.', ar: 'قيم تاريخية غير كافية لمعاينة المخطط.' },
  paramCol: { en: 'Parameter', ar: 'المعامل' },
  unitCol: { en: 'Unit', ar: 'الوحدة' },
  displayOnly: { en: 'Display only', ar: 'عرض فقط' },
  colActionNo: { en: 'Ac.No', ar: 'رقم الإجراء' },
  colRevision: { en: 'Revision Date', ar: 'تاريخ المراجعة' },
  colSampleDate: { en: 'Sample Date', ar: 'تاريخ العينة' },
  colSampleResult: { en: 'Sample Result', ar: 'نتيجة العينة' },
  colStatus: { en: 'Status', ar: 'الحالة' },
  colAgreed: { en: 'Agreed Action', ar: 'الإجراء المتفق عليه' },
  colCompleted: { en: 'Completed Date', ar: 'تاريخ الإكمال' },
} as const;

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function fieldLabel(field: SampleReportInfoField, locale: string): string {
  return locale === 'ar' ? field.labelAr : field.labelEn;
}

function labCellClass(color: LabCellColor | null): string {
  if (!color) return '';
  return `acc-oa-sample-report__lab-cell--${color}`;
}

interface InfoGridProps {
  readonly fields: readonly SampleReportInfoField[];
  readonly locale: string;
}

function InfoGrid({ fields, locale }: InfoGridProps): React.ReactElement {
  return (
    <dl className="acc-oa-sample-report__info-grid">
      {fields.map((field) => (
        <div key={field.labelEn} className="acc-oa-sample-report__info-item">
          <dt>{fieldLabel(field, locale)}</dt>
          <dd>{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

interface TrendTableProps {
  readonly data: SampleReportView;
  readonly locale: string;
}

function TrendTable({ data, locale }: TrendTableProps): React.ReactElement {
  const l = (bundle: L10n<string>) => t(bundle, locale);
  let currentGroup = '';

  return (
    <div className="acc-oa-sample-report__trend-scroll">
      <table className="acc-oa-sample-report__trend-table">
        <thead>
          <tr>
            <th className="acc-oa-sample-report__trend-sticky">{l(COPY.paramCol)}</th>
            <th>{l(COPY.unitCol)}</th>
            {data.trendColumns.map((col) => (
              <th
                key={col.key}
                className={col.isSelected ? 'acc-oa-sample-report__trend-col--selected' : undefined}
              >
                <span className="acc-oa-sample-report__trend-col-date">{col.label}</span>
                <span className="acc-oa-sample-report__trend-col-id">{col.labSampleId}</span>
                {col.isDisplayOnly && (
                  <span className="acc-oa-sample-report__trend-col-tag">{l(COPY.displayOnly)}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.trendRows.map((row) => {
            const showGroup = row.groupLabel && row.groupLabel !== currentGroup;
            if (showGroup) currentGroup = row.groupLabel;
            return (
              <React.Fragment key={row.id}>
                {showGroup && (
                  <tr className="acc-oa-sample-report__trend-group">
                    <td colSpan={2 + data.trendColumns.length}>{row.groupLabel}</td>
                  </tr>
                )}
                <TrendTableRow row={row} />
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TrendTableRow({ row }: { row: SampleReportTrendRow }): React.ReactElement {
  return (
    <tr>
      <td className="acc-oa-sample-report__trend-sticky">{row.label}</td>
      <td className="acc-oa-sample-report__trend-unit">{row.unit || '—'}</td>
      {row.cells.map((cell, index) => (
        <td
          key={`${row.id}-${index}`}
          className={labCellClass(cell.color)}
        >
          {row.id === 'reportStatus' && cell.value ? (
            <StatusBadge
              variant={
                cell.color === 'red'
                  ? 'alert'
                  : cell.color === 'yellow'
                    ? 'caution'
                    : cell.color === 'green'
                      ? 'normal'
                      : 'pending-review'
              }
              label={cell.value}
              size="sm"
            />
          ) : (
            cell.value || '—'
          )}
        </td>
      ))}
    </tr>
  );
}

interface ReportChartProps {
  readonly group: SampleReportChartGroup;
  readonly locale: string;
}

function ReportChart({ group, locale }: ReportChartProps): React.ReactElement {
  const label = locale === 'ar' ? group.labelAr : group.labelEn;
  const width = 280;
  const height = 140;
  const pad = { top: 12, right: 8, bottom: 22, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  if (group.series.length === 0) {
    return (
      <div className="acc-oa-sample-report__chart">
        <h4 className="acc-oa-sample-report__chart-title">{label}</h4>
        <p className="acc-oa-sample-report__chart-empty">—</p>
      </div>
    );
  }

  const allValues = group.series.flatMap((s) => s.points.map((p) => p.value));
  const minV = Math.min(...allValues);
  const maxV = Math.max(...allValues);
  const span = maxV - minV || 1;
  const yMin = minV - span * 0.1;
  const yMax = maxV + span * 0.1;

  const allDates = [...new Set(group.series.flatMap((s) => s.points.map((p) => p.at)))].sort();
  const xAt = (date: string) => {
    const index = allDates.indexOf(date);
    return pad.left + (index / Math.max(allDates.length - 1, 1)) * innerW;
  };
  const yAt = (value: number) => pad.top + innerH - ((value - yMin) / (yMax - yMin)) * innerH;

  const colors = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#7c3aed'];

  return (
    <div className="acc-oa-sample-report__chart">
      <h4 className="acc-oa-sample-report__chart-title">{label}</h4>
      <svg
        className="acc-oa-sample-report__chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
      >
        {group.series.map((series, seriesIndex) => {
          const path = series.points
            .map((point, i) => {
              const x = xAt(point.at);
              const y = yAt(point.value);
              return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
            })
            .join(' ');
          const color = colors[seriesIndex % colors.length]!;
          return (
            <g key={series.id}>
              <path d={path} fill="none" stroke={color} strokeWidth="2" />
              {series.points.map((point) => (
                <circle
                  key={`${series.id}-${point.at}`}
                  cx={xAt(point.at)}
                  cy={yAt(point.value)}
                  r={3}
                  fill={color}
                />
              ))}
            </g>
          );
        })}
      </svg>
      <ul className="acc-oa-sample-report__chart-legend">
        {group.series.map((series, index) => (
          <li key={series.id}>
            <span
              className="acc-oa-sample-report__chart-swatch"
              style={{ background: colors[index % colors.length] }}
            />
            {series.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function actionColumns(locale: string): DataTableColumn<SampleReportActionRow>[] {
  const l = (bundle: L10n<string>) => t(bundle, locale);
  return [
    { id: 'actionNumber', header: l(COPY.colActionNo), accessor: 'actionNumber' },
    { id: 'revisionDate', header: l(COPY.colRevision), accessor: 'revisionDate', renderCell: (row) => formatDate(row.revisionDate) },
    { id: 'sampleDate', header: l(COPY.colSampleDate), accessor: 'sampleDate', renderCell: (row) => formatDate(row.sampleDate) },
    {
      id: 'sampleResult',
      header: l(COPY.colSampleResult),
      renderCell: (row) => {
        const badge = registerStatusBadge(row.sampleResultVariant);
        return <StatusBadge variant={badge.variant} label={badge.label} size="sm" />;
      },
    },
    { id: 'status', header: l(COPY.colStatus), accessor: 'status' },
    { id: 'agreedAction', header: l(COPY.colAgreed), accessor: 'agreedAction' },
    { id: 'completedDate', header: l(COPY.colCompleted), renderCell: (row) => formatDate(row.completedDate) },
  ];
}

export default function SampleReport(): React.ReactElement {
  const { locale } = useLanguage();
  const l = useCallback((bundle: L10n<string>) => t(bundle, locale), [locale]);
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const sdk = usePlatformSdk();
  const { status: authStatus } = useAuth();

  const equipmentId = searchParams.get('equipment') ?? '';
  const lpId = searchParams.get('lp') ?? '';
  const sampleId = searchParams.get('sample') ?? '';

  const contractorScope = useMemo(
    () => resolveOilAnalysisContractorScope(sdk),
    [sdk],
  );

  const pageResult = useMemo(() => {
    if (authStatus !== 'authenticated') return { kind: 'loading' as const };
    return sampleReportService.load(
      equipmentId,
      lpId,
      contractorScope,
      sampleId || undefined,
    );
  }, [authStatus, contractorScope, equipmentId, lpId, sampleId]);

  const selectableSamples = useMemo(() => {
    if (!equipmentId || !lpId || authStatus !== 'authenticated') return [];
    return sampleReportService.listSelectableSamples(equipmentId, lpId, contractorScope);
  }, [authStatus, contractorScope, equipmentId, lpId]);

  const updateQuery = (key: string, value: string): void => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const openOriginalPdf = (url: string | null): void => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    window.alert(l(COPY.noPdf));
  };

  if (pageResult.kind === 'loading') {
    return (
      <div className="acc-oa-page acc-oa-sample-report">
        <PageHeader title={l(COPY.title)} subtitle={l(COPY.subtitle)} />
        <ReportPreview loading>
          <div />
        </ReportPreview>
      </div>
    );
  }

  if (pageResult.kind === 'forbidden') {
    return <ErrorState message={l(COPY.forbidden)} className="acc-oa-page" />;
  }

  if (pageResult.kind === 'not-found') {
    return (
      <div className="acc-oa-page acc-oa-sample-report">
        <PageHeader title={l(COPY.title)} subtitle={l(COPY.subtitle)} />
        <EmptyState title={l(COPY.notFound)} />
        <Link to="/oil-analysis/register" className="acc-btn acc-btn--secondary">
          {l(COPY.breadcrumbRegister)}
        </Link>
      </div>
    );
  }

  const data = pageResult.data;
  const statusBadge = registerStatusBadge(data.reportStatusVariant);

  const timelineEvents: TimelineEvent[] = data.timeline.map((item) => {
    const badge = registerStatusBadge(item.status);
    return {
      id: item.id,
      date: formatDate(item.date),
      label: locale === 'ar' ? item.labelAr : item.labelEn,
      kind: item.id.startsWith('oc-') ? 'oil-change' : 'sample',
      status: badge.variant as StatusBadgeVariant,
      statusLabel: badge.label,
      detail: locale === 'ar' ? item.detailAr : item.detailEn,
    };
  });

  const equipmentDetailsHref = `/oil-analysis/equipment/${encodeURIComponent(data.equipmentId)}?lp=${encodeURIComponent(data.lpId)}`;

  return (
    <div className="acc-oa-page acc-oa-sample-report">
      <PageHeader
        title={l(COPY.title)}
        subtitle={l(COPY.subtitle)}
        breadcrumbs={[
          { label: l(COPY.breadcrumbModule), href: '/oil-analysis' },
          { label: l(COPY.breadcrumbRegister), href: '/oil-analysis/register' },
          { label: l(COPY.breadcrumbEquipment), href: equipmentDetailsHref },
          { label: l(COPY.title) },
        ]}
        actions={(
          <div className="acc-oa-sample-report__header-actions">
            <StatusBadge variant={statusBadge.variant} label={statusBadge.label} />
            <span className="acc-oa-sample-report__sample-count">
              {data.sampleCount} {l(COPY.samples)}
            </span>
            <button
              type="button"
              className="acc-btn acc-btn--secondary"
              onClick={() => openOriginalPdf(data.pdfFileUrl)}
            >
              {l(COPY.originalPdf)}
            </button>
          </div>
        )}
      />

      <SectionCard title={l(COPY.selEquipment)} className="acc-oa-sample-report__selector">
        <div className="acc-oa-sample-report__selector-row">
          <label className="acc-oa-sample-report__field">
            <span>{l(COPY.selEquipment)}</span>
            <input
              type="text"
              className="acc-oa-sample-report__input"
              value={`${data.equipmentName} (${data.equipmentId})`}
              readOnly
            />
          </label>
          <label className="acc-oa-sample-report__field">
            <span>{l(COPY.selLp)}</span>
            <select
              className="acc-oa-sample-report__select"
              value={data.lpId}
              onChange={(e) => updateQuery('lp', e.target.value)}
              disabled
            >
              <option value={data.lpId}>{data.lpName} ({data.lpId})</option>
            </select>
          </label>
          <label className="acc-oa-sample-report__field">
            <span>{l(COPY.selSample)}</span>
            <select
              className="acc-oa-sample-report__select"
              value={data.selectedSampleInternalId}
              onChange={(e) => updateQuery('sample', e.target.value)}
            >
              {selectableSamples.map((sample) => (
                <option key={sample.id} value={sample.id}>
                  {sample.labSampleId} — {formatDate(sample.sampledAt)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="acc-oa-sample-report__oil-strip">
          <span>{l(COPY.oilChangeLast)}: {formatDate(data.oilChangeStrip.lastOilChange)}</span>
          <span>{l(COPY.oilChangeType)}: {data.oilChangeStrip.oilType}</span>
          <span>{l(COPY.oilChangeBrand)}: {data.oilChangeStrip.brand}</span>
          <span>{l(COPY.oilChangeNext)}: {formatDate(data.oilChangeStrip.nextDue)}</span>
          <span>{l(COPY.oilChangeBy)}: {data.oilChangeStrip.performedBy}</span>
        </div>
      </SectionCard>

      <div className={`acc-oa-sample-report__status-banner acc-oa-sample-report__status-banner--${statusBadge.variant}`}>
        <StatusBadge variant={statusBadge.variant} label={data.reportStatus} size="md" />
        <span className="acc-oa-sample-report__asset-id">{data.equipmentId}</span>
      </div>

      <ReportPreview
        toolbarExtra={(
          <Link to={equipmentDetailsHref} className="acc-btn acc-btn--ghost">
            {l(COPY.breadcrumbEquipment)}
          </Link>
        )}
      >
        <ReportLayout
          title={l(COPY.title)}
          subtitle={`${data.equipmentName} · ${data.lpId}`}
          reference={data.selectedLabSampleId}
          generatedAt={formatDate(data.selectedSampleDate)}
          metadata={[
            { label: l(COPY.selEquipment), value: data.equipmentId },
            { label: 'LP_ID', value: data.lpId },
            { label: l(COPY.colSampleResult), value: data.reportStatus },
          ]}
          footer={(
            <p className="acc-report__footer-text">
              ACC Reliability Platform — Oil Analysis Engineering Report
            </p>
          )}
        >
          <div className="acc-oa-sample-report__info-panels">
            <ReportSection title={l(COPY.secAccount)}>
              <InfoGrid fields={data.accountInfo} locale={locale} />
            </ReportSection>
            <ReportSection title={l(COPY.secSample)}>
              <InfoGrid fields={data.sampleInfo} locale={locale} />
            </ReportSection>
            <ReportSection title={l(COPY.secEquipment)}>
              <InfoGrid fields={data.equipmentInfo} locale={locale} />
            </ReportSection>
          </div>

          <div className="acc-oa-sample-report__unit-strip">
            {data.unitStrip.map((field) => (
              <span key={field.labelEn}>
                <strong>{fieldLabel(field, locale)}:</strong> {field.value}
              </span>
            ))}
          </div>

          <ReportSection title={l(COPY.secTrends)}>
            <div className={`acc-oa-sample-report__trends-layout${isMobile ? ' acc-oa-sample-report__trends-layout--stack' : ''}`}>
              <TrendTable data={data} locale={locale} />
              <div className="acc-oa-sample-report__charts">
                <h3 className="acc-oa-sample-report__charts-heading">{l(COPY.secCharts)}</h3>
                {data.chartGroups.every((g) => g.series.length === 0) ? (
                  <p className="acc-oa-sample-report__chart-empty">{l(COPY.emptyCharts)}</p>
                ) : (
                  <div className="acc-oa-sample-report__charts-grid">
                    {data.chartGroups.map((group) => (
                      <ReportChart key={group.id} group={group} locale={locale} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ReportSection>

          <ReportSection title={l(COPY.secRecommendations)}>
            {data.recommendations ? (
              <p className="acc-oa-sample-report__recommendations">{data.recommendations}</p>
            ) : (
              <EmptyState title={l(COPY.emptyRecommendations)} />
            )}
          </ReportSection>

          <ReportSection title={l(COPY.secTimeline)}>
            <Timeline
              events={timelineEvents}
              direction={isMobile ? 'vertical' : 'horizontal'}
              emptyLabel={l(COPY.notFound)}
            />
          </ReportSection>

          <ReportSection title={l(COPY.secActions)}>
            {data.lastActions.length === 0 ? (
              <EmptyState title={l(COPY.emptyActions)} />
            ) : (
              <DataTable
                columns={actionColumns(locale)}
                data={[...data.lastActions]}
                stickyHeader={false}
              />
            )}
          </ReportSection>
        </ReportLayout>
      </ReportPreview>
    </div>
  );
}
