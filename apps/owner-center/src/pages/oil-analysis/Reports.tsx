// apps/owner-center/src/pages/oil-analysis/Reports.tsx
// OA-008 — Oil Analysis Reports Center.

import React, { useCallback, useMemo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { usePlatformSdk } from '../../context/SdkContext';
import { useOilAnalysisPermissions } from '../../hooks/useOilAnalysisPermissions';
import { OilAnalysisActionButton } from '../../components/oil-analysis/OilAnalysisActionButton';
import {
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  KpiCard,
  KpiGrid,
  PageHeader,
  ReportLayout,
  ReportPreview,
  ReportSection,
  SectionCard,
  StatusBadge,
} from '../../components/ui';
import type { DataTableColumn, FilterFieldConfig, StatusBadgeVariant } from '../../components/ui';
import { resolveOilAnalysisContractorScope } from '../../modules/oil-analysis/contractor-scope';
import {
  OIL_REPORT_CATEGORIES,
  OIL_REPORT_TEMPLATES,
  getReportFavorites,
  templateLabel,
  templatesForCategory,
  toggleReportFavorite,
  type OilReportCategory,
  type OilReportTemplateDef,
  type OilReportType,
} from '../../modules/oil-analysis/report-catalog';
import {
  generateOilReport,
  getReportFilterOptions,
  hasReportData,
  type OilReportFilters,
  type OilReportOutput,
} from '../../modules/oil-analysis/report.service';
import { exportReportExcel, exportReportPdf } from '../../modules/oil-analysis/report-export';
import { oilAnalysisSettingsService } from '../../modules/oil-analysis/settings.service';

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

function formatDate(iso: string, locale: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(locale === 'ar' ? 'ar-SA' : undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

const COPY = {
  title: { en: 'Reports', ar: 'التقارير' },
  subtitle: {
    en: 'Professional oil analysis reporting — select a template, apply filters, preview, and export.',
    ar: 'تقارير تحليل الزيت الاحترافية — اختر قالباً، طبّق الفلاتر، عاين، ثم صدّر.',
  },
  stepCategory: { en: '1. Select category', ar: '١. اختر الفئة' },
  stepReport: { en: '2. Select report', ar: '٢. اختر التقرير' },
  stepFilters: { en: '3. Apply filters', ar: '٣. طبّق الفلاتر' },
  stepPreview: { en: '4. Preview & export', ar: '٤. المعاينة والتصدير' },
  favorites: { en: 'Favorites', ar: 'المفضلة' },
  pin: { en: 'Pin', ar: 'تثبيت' },
  unpin: { en: 'Unpin', ar: 'إلغاء التثبيت' },
  preview: { en: 'Generate preview', ar: 'إنشاء المعاينة' },
  exportPdf: { en: 'Export PDF', ar: 'تصدير PDF' },
  exportExcel: { en: 'Export Excel', ar: 'تصدير Excel' },
  empty: {
    en: 'No records match the current filters.',
    ar: 'لا توجد سجلات تطابق المرشحات الحالية.',
  },
  emptyTitle: { en: 'No data for this report', ar: 'لا توجد بيانات لهذا التقرير' },
  lpFilter: { en: 'LP_ID', ar: 'LP_ID' },
  selectAll: { en: 'Select all', ar: 'تحديد الكل' },
  clearLp: { en: 'Clear selection', ar: 'مسح التحديد' },
  filterDate: { en: 'Date range', ar: 'نطاق التاريخ' },
  filterEquipment: { en: 'Equipment_ID', ar: 'Equipment_ID' },
  filterArea: { en: 'Area', ar: 'المنطقة' },
  filterContractor: { en: 'Contractor', ar: 'المقاول' },
  filterOilType: { en: 'Oil Type', ar: 'نوع الزيت' },
  filterReportStatus: { en: 'Report Status', ar: 'حالة التقرير' },
  filterEquipStatus: { en: 'Equipment Status', ar: 'حالة المعدة' },
  filterSampleId: { en: 'Sample ID', ar: 'معرّف العينة' },
  filterAll: { en: 'All', ar: 'الكل' },
  clearFilters: { en: 'Clear filters', ar: 'مسح الفلاتر' },
  secData: { en: 'Report Data', ar: 'بيانات التقرير' },
  secBreakdown: { en: 'Breakdown', ar: 'التفصيل' },
  secCharts: { en: 'Charts', ar: 'المخططات' },
  colGroup: { en: 'Group', ar: 'المجموعة' },
  colCount: { en: 'Count', ar: 'العدد' },
  liveData: { en: 'Live data', ar: 'بيانات حية' },
  accOnly: { en: 'ACC only', ar: 'ACC فقط' },
} as const;

const EQUIPMENT_STATUS_LABELS: Record<string, L10n<string>> = {
  normal: { en: 'Normal', ar: 'طبيعي' },
  caution: { en: 'Caution', ar: 'حذر' },
  alert: { en: 'Alert', ar: 'تنبيه' },
  pending: { en: 'Pending', ar: 'قيد الانتظار' },
  none: { en: 'No sample', ar: 'لا توجد عينة' },
  overdue: { en: 'Overdue', ar: 'متأخر' },
};

function statusVariant(value: string): StatusBadgeVariant {
  if (value === 'alert' || value === 'critical') return 'alert';
  if (value === 'caution' || value === 'monitor') return 'caution';
  if (value === 'normal') return 'normal';
  if (value === 'overdue') return 'overdue';
  if (value === 'pending') return 'pending-review';
  return 'disabled';
}

interface LpMultiSelectProps {
  readonly lpIds: readonly string[];
  readonly selected: readonly string[];
  readonly onChange: (next: string[]) => void;
  readonly locale: string;
}

function LpMultiSelect({ lpIds, selected, onChange, locale }: LpMultiSelectProps): React.ReactElement {
  const l = (b: L10n<string>) => t(b, locale);
  const allSelected = lpIds.length > 0 && selected.length === lpIds.length;

  return (
    <div className="acc-oa-reports__lp-select">
      <div className="acc-oa-reports__lp-select-header">
        <span className="acc-oa-reports__lp-select-label">{l(COPY.lpFilter)}</span>
        <div className="acc-oa-reports__lp-select-actions">
          <button
            type="button"
            className="acc-btn acc-btn--ghost acc-btn--sm"
            onClick={() => onChange(allSelected ? [] : [...lpIds])}
          >
            {allSelected ? l(COPY.clearLp) : l(COPY.selectAll)}
          </button>
        </div>
      </div>
      <div className="acc-oa-reports__lp-select-grid">
        {lpIds.map((lpId) => {
          const checked = selected.includes(lpId);
          return (
            <label key={lpId} className="acc-oa-reports__lp-option">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  onChange(
                    checked ? selected.filter((id) => id !== lpId) : [...selected, lpId],
                  );
                }}
              />
              <span>{lpId}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

interface SimpleBarChartProps {
  readonly title: string;
  readonly labels: readonly string[];
  readonly values: readonly number[];
  readonly colors?: readonly string[];
}

function SimpleBarChart({ title, labels, values, colors }: SimpleBarChartProps): React.ReactElement {
  const max = Math.max(...values, 1);
  const width = 360;
  const height = 160;
  const pad = { top: 12, right: 8, bottom: 32, left: 8 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const barW = innerW / Math.max(labels.length, 1) - 6;

  return (
    <div className="acc-oa-reports__chart">
      <h4 className="acc-oa-reports__chart-title">{title}</h4>
      {values.every((v) => v === 0) ? (
        <p className="acc-oa-reports__chart-empty">—</p>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="acc-oa-reports__chart-svg" role="img" aria-label={title}>
          {labels.map((label, i) => {
            const value = values[i] ?? 0;
            const barH = (value / max) * innerH;
            const x = pad.left + i * (barW + 6);
            const y = pad.top + innerH - barH;
            return (
              <g key={label}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx={2}
                  fill={colors?.[i] ?? 'var(--color-primary, #2563eb)'}
                />
                <text x={x + barW / 2} y={height - 6} textAnchor="middle" className="acc-oa-reports__chart-label">
                  {label.length > 8 ? `${label.slice(0, 7)}…` : label}
                </text>
                {value > 0 && (
                  <text x={x + barW / 2} y={y - 3} textAnchor="middle" className="acc-oa-reports__chart-value">
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

interface ReportPreviewBodyProps {
  readonly output: OilReportOutput;
  readonly locale: string;
}

function ReportPreviewBody({ output, locale }: ReportPreviewBodyProps): React.ReactElement {
  const l = (b: L10n<string>) => t(b, locale);
  const { report } = output;
  const settings = oilAnalysisSettingsService.getSettings();
  const showCharts = settings.reportSettings.enableCharts;

  const tableColumns: DataTableColumn<{ id: string } & Record<string, string | number | null>>[] =
    report.tableColumns.map((col) => ({
      id: col.id,
      header: col.label,
      renderCell: (row) => {
        const val = row[col.id];
        const text = val === null || val === undefined ? '—' : String(val);
        if (col.id === 'status' || col.id === 'condition') {
          return <StatusBadge variant={statusVariant(text)} label={text} size="sm" />;
        }
        return text;
      },
    }));

  const tableData = report.tableRows.map((row, index) => ({
    id: String(row.sampleId ?? row.lpId ?? row.equipmentId ?? index),
    ...row,
  }));

  return (
    <>
      {showCharts &&
        report.charts.map((chart) => (
          <ReportSection key={chart.title} title={chart.title}>
            <SimpleBarChart
              title={chart.title}
              labels={chart.slices.map((s) => s.label)}
              values={chart.slices.map((s) => s.value)}
              colors={chart.slices.map((s) => s.color ?? 'var(--color-primary)')}
            />
          </ReportSection>
        ))}

      {report.tableRows.length > 0 && (
        <ReportSection title={l(COPY.secData)}>
          <DataTable
            columns={tableColumns}
            data={tableData}
          />
        </ReportSection>
      )}

      {report.breakdowns.map((breakdown) =>
        breakdown.rows.length > 0 ? (
          <ReportSection key={breakdown.title} title={breakdown.title}>
            <table className="acc-data-table acc-data-table--compact">
              <thead>
                <tr>
                  <th>{l(COPY.colGroup)}</th>
                  <th>{l(COPY.colCount)}</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.rows.map((row) => (
                  <tr key={row.key}>
                    <td>{row.key}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ReportSection>
        ) : null,
      )}
    </>
  );
}

export default function Reports(): React.ReactElement {
  const { locale } = useLanguage();
  const l = (b: L10n<string>) => t(b, locale);
  const sdk = usePlatformSdk();
  const { user } = useAuth();
  const permissions = useOilAnalysisPermissions();
  const scope = useMemo(() => resolveOilAnalysisContractorScope(sdk), [sdk]);

  const filterOptions = useMemo(() => getReportFilterOptions(scope), [scope]);

  const [category, setCategory] = useState<OilReportCategory>('operational');
  const [reportType, setReportType] = useState<OilReportType>('sample-summary');
  const [favorites, setFavorites] = useState<OilReportType[]>(() => getReportFavorites());
  const [previewRequested, setPreviewRequested] = useState(true);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLpIds, setSelectedLpIds] = useState<string[]>([]);
  const [equipmentId, setEquipmentId] = useState('');
  const [area, setArea] = useState('');
  const [contractor, setContractor] = useState('');
  const [oilType, setOilType] = useState('');
  const [reportStatus, setReportStatus] = useState('');
  const [equipmentStatus, setEquipmentStatus] = useState('');
  const [sampleId, setSampleId] = useState('');

  const filters: OilReportFilters = useMemo(
    () => ({
      reportType,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      lpIds: selectedLpIds.length > 0 ? selectedLpIds : undefined,
      equipmentId: equipmentId || undefined,
      area: area || undefined,
      contractor: contractor || undefined,
      oilType: oilType || undefined,
      reportStatus: reportStatus || undefined,
      equipmentStatus: equipmentStatus || undefined,
      sampleId: sampleId || undefined,
    }),
    [
      reportType,
      dateFrom,
      dateTo,
      selectedLpIds,
      equipmentId,
      area,
      contractor,
      oilType,
      reportStatus,
      equipmentStatus,
      sampleId,
    ],
  );

  const output = useMemo(
    () => (previewRequested ? generateOilReport(scope, filters) : null),
    [previewRequested, scope, filters],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (dateFrom || dateTo) count += 1;
    if (selectedLpIds.length > 0) count += 1;
    if (equipmentId) count += 1;
    if (area) count += 1;
    if (contractor) count += 1;
    if (oilType) count += 1;
    if (reportStatus) count += 1;
    if (equipmentStatus) count += 1;
    if (sampleId) count += 1;
    return count;
  }, [
    dateFrom,
    dateTo,
    selectedLpIds,
    equipmentId,
    area,
    contractor,
    oilType,
    reportStatus,
    equipmentStatus,
    sampleId,
  ]);

  const categoryTemplates = useMemo(
    () => templatesForCategory(category, scope.canViewAllContractors),
    [category, scope.canViewAllContractors],
  );

  const favoriteTemplates = useMemo(
    () =>
      favorites
        .map((id) => OIL_REPORT_TEMPLATES.find((t) => t.id === id))
        .filter((t): t is OilReportTemplateDef => Boolean(t))
        .filter((t) => !t.accOnly || scope.canViewAllContractors),
    [favorites, scope.canViewAllContractors],
  );

  const handleToggleFavorite = useCallback((type: OilReportType) => {
    setFavorites(toggleReportFavorite(type));
  }, []);

  const handleClearFilters = useCallback(() => {
    setDateFrom('');
    setDateTo('');
    setSelectedLpIds([]);
    setEquipmentId('');
    setArea('');
    setContractor('');
    setOilType('');
    setReportStatus('');
    setEquipmentStatus('');
    setSampleId('');
  }, []);

  const filterFields: FilterFieldConfig[] = useMemo(() => {
    const fields: FilterFieldConfig[] = [
      {
        id: 'dateRange',
        label: l(COPY.filterDate),
        type: 'date-range',
        valueFrom: dateFrom,
        valueTo: dateTo,
      },
      {
        id: 'equipmentId',
        label: l(COPY.filterEquipment),
        type: 'select',
        value: equipmentId,
        options: filterOptions.equipmentIds.map((id) => ({ value: id, label: id })),
      },
      {
        id: 'area',
        label: l(COPY.filterArea),
        type: 'select',
        value: area,
        options: filterOptions.areas.map((id) => ({ value: id, label: id })),
      },
      {
        id: 'oilType',
        label: l(COPY.filterOilType),
        type: 'select',
        value: oilType,
        options: filterOptions.oilTypes.map((id) => ({ value: id, label: id })),
      },
      {
        id: 'reportStatus',
        label: l(COPY.filterReportStatus),
        type: 'select',
        value: reportStatus,
        options: filterOptions.reportStatuses.map((id) => ({ value: id, label: id })),
      },
      {
        id: 'equipmentStatus',
        label: l(COPY.filterEquipStatus),
        type: 'select',
        value: equipmentStatus,
        options: filterOptions.equipmentStatuses.map((id) => ({
          value: id,
          label: EQUIPMENT_STATUS_LABELS[id] ? l(EQUIPMENT_STATUS_LABELS[id]!) : id,
        })),
      },
      {
        id: 'sampleId',
        label: l(COPY.filterSampleId),
        type: 'select',
        value: sampleId,
        options: [],
        hidden: true,
      },
    ];

    if (scope.canViewAllContractors) {
      fields.splice(3, 0, {
        id: 'contractor',
        label: l(COPY.filterContractor),
        type: 'select',
        value: contractor,
        options: filterOptions.contractors.map((id) => ({ value: id, label: id })),
      });
    }

    return fields;
  }, [
    l,
    dateFrom,
    dateTo,
    equipmentId,
    area,
    contractor,
    oilType,
    reportStatus,
    equipmentStatus,
    sampleId,
    filterOptions,
    scope.canViewAllContractors,
  ]);

  const handleFilterChange = useCallback((id: string, value: string) => {
    switch (id) {
      case 'equipmentId':
        setEquipmentId(value);
        break;
      case 'area':
        setArea(value);
        break;
      case 'contractor':
        setContractor(value);
        break;
      case 'oilType':
        setOilType(value);
        break;
      case 'reportStatus':
        setReportStatus(value);
        break;
      case 'equipmentStatus':
        setEquipmentStatus(value);
        break;
      default:
        break;
    }
  }, []);

  const templateTitle = useMemo(() => {
    const template = categoryTemplates.find((t) => t.id === reportType);
    return template ? templateLabel(template, locale).title : reportType;
  }, [categoryTemplates, reportType, locale]);

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (dateFrom) parts.push(`${l(COPY.filterDate)}: ${dateFrom}`);
    if (dateTo) parts.push(`→ ${dateTo}`);
    if (selectedLpIds.length > 0) parts.push(`${selectedLpIds.length} LP`);
    if (equipmentId) parts.push(equipmentId);
    if (area) parts.push(area);
    if (contractor) parts.push(contractor);
    if (oilType) parts.push(oilType);
    if (reportStatus) parts.push(reportStatus);
    if (equipmentStatus) parts.push(equipmentStatus);
    if (sampleId) parts.push(sampleId);
    return parts.length > 0 ? parts.join(' · ') : l(COPY.filterAll);
  }, [
    dateFrom,
    dateTo,
    selectedLpIds,
    equipmentId,
    area,
    contractor,
    oilType,
    reportStatus,
    equipmentStatus,
    sampleId,
    l,
  ]);

  if (!user) {
    return <ErrorState title="Authentication required" message="Please sign in to access Oil Analysis reports." />;
  }

  return (
    <div className="acc-page acc-oa-reports">
      <PageHeader
        title={l(COPY.title)}
        subtitle={l(COPY.subtitle)}
        status={{ variant: 'normal', label: l(COPY.liveData) }}
      />

      <SectionCard title={l(COPY.stepCategory)}>
        <div className="acc-oa-reports__categories">
          {OIL_REPORT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`acc-oa-reports__category-card${category === cat.id ? ' acc-oa-reports__category-card--active' : ''}`}
              onClick={() => setCategory(cat.id)}
            >
              <span className="acc-oa-reports__category-title">
                {locale === 'ar' ? cat.labelAr : cat.labelEn}
              </span>
            </button>
          ))}
        </div>
      </SectionCard>

      {favoriteTemplates.length > 0 && (
        <SectionCard title={l(COPY.favorites)}>
          <div className="acc-oa-reports__templates">
            {favoriteTemplates.map((template) => {
              const { title, description } = templateLabel(template, locale);
              const isActive = reportType === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  className={`acc-oa-reports__template-card${isActive ? ' acc-oa-reports__template-card--active' : ''}`}
                  onClick={() => {
                    setReportType(template.id);
                    setCategory(template.category);
                    setPreviewRequested(true);
                  }}
                >
                  <span className="acc-oa-reports__template-title">{title}</span>
                  <span className="acc-oa-reports__template-desc">{description}</span>
                </button>
              );
            })}
          </div>
        </SectionCard>
      )}

      <SectionCard title={l(COPY.stepReport)}>
        <div className="acc-oa-reports__templates">
          {categoryTemplates.map((template) => {
            const { title, description } = templateLabel(template, locale);
            const isActive = reportType === template.id;
            const isFavorite = favorites.includes(template.id);
            return (
              <div
                key={template.id}
                className={`acc-oa-reports__template-card${isActive ? ' acc-oa-reports__template-card--active' : ''}`}
              >
                <button
                  type="button"
                  className="acc-oa-reports__template-select"
                  onClick={() => {
                    setReportType(template.id);
                    setPreviewRequested(true);
                  }}
                >
                  <span className="acc-oa-reports__template-title">
                    {title}
                    {template.accOnly && (
                      <StatusBadge variant="info" label={l(COPY.accOnly)} size="sm" />
                    )}
                  </span>
                  <span className="acc-oa-reports__template-desc">{description}</span>
                </button>
                <button
                  type="button"
                  className="acc-oa-reports__pin-btn"
                  aria-label={isFavorite ? l(COPY.unpin) : l(COPY.pin)}
                  onClick={() => handleToggleFavorite(template.id)}
                >
                  {isFavorite ? '★' : '☆'}
                </button>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title={l(COPY.stepFilters)}>
        <FilterBar
          searchValue={sampleId}
          searchPlaceholder={l(COPY.filterSampleId)}
          onSearchChange={setSampleId}
          filters={filterFields}
          onFilterChange={handleFilterChange}
          onDateFromChange={(_, value) => setDateFrom(value)}
          onDateToChange={(_, value) => setDateTo(value)}
          onClear={handleClearFilters}
          clearLabel={l(COPY.clearFilters)}
          activeFilterCount={activeFilterCount}
          trailing={
            <OilAnalysisActionButton
              type="button"
              className="acc-btn acc-btn--primary"
              allowed
              onClick={() => setPreviewRequested(true)}
            >
              {l(COPY.preview)}
            </OilAnalysisActionButton>
          }
        />

        {filterOptions.lpIds.length > 0 && (
          <LpMultiSelect
            lpIds={filterOptions.lpIds}
            selected={selectedLpIds}
            onChange={setSelectedLpIds}
            locale={locale}
          />
        )}
      </SectionCard>

      <SectionCard title={l(COPY.stepPreview)}>
        {!previewRequested || !output ? (
          <EmptyState
            title={l(COPY.preview)}
            description={l(COPY.subtitle)}
          />
        ) : !hasReportData(output) ? (
          <EmptyState title={l(COPY.emptyTitle)} description={l(COPY.empty)} />
        ) : (
          <>
            {output.kpis.length > 0 && (
              <KpiGrid>
                {output.kpis.map((kpi) => (
                  <KpiCard
                    key={kpi.label}
                    label={kpi.label}
                    value={String(kpi.value)}
                    severity="info"
                  />
                ))}
              </KpiGrid>
            )}

            <ReportPreview
              onExportPdf={
                permissions.canExportReports
                  ? () => exportReportPdf(output, locale)
                  : undefined
              }
              onExportExcel={
                permissions.canExportReports
                  ? () => exportReportExcel(output, locale)
                  : undefined
              }
              exportPdfLabel={l(COPY.exportPdf)}
              exportExcelLabel={l(COPY.exportExcel)}
            >
              <ReportLayout
                title={templateTitle}
                subtitle="ACC Reliability Platform — Oil Analysis"
                reference={output.reference}
                generatedAt={formatDate(output.generatedAt, locale)}
                generatedBy={user.displayName ?? user.email ?? '—'}
                filterSummary={filterSummary}
                footer={
                  oilAnalysisSettingsService.getSettings().reportSettings.enableFooter ? (
                    <p className="acc-report__footer-text">
                      ACC Reliability Platform — Confidential Engineering Report
                    </p>
                  ) : undefined
                }
              >
                <ReportPreviewBody output={output} locale={locale} />
              </ReportLayout>
            </ReportPreview>
          </>
        )}
      </SectionCard>
    </div>
  );
}
