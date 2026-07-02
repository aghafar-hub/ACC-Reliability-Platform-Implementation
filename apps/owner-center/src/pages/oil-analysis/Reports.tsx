// apps/owner-center/src/pages/oil-analysis/Reports.tsx
// Oil Analysis — Reports (Sprint 08).

import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { StatusChip } from '../../components/StatusChip';
import { SummaryCard } from '../../components/SummaryCard';
import { OilAnalysisActionButton } from '../../components/oil-analysis/OilAnalysisActionButton';
import { useOilAnalysisPermissions } from '../../hooks/useOilAnalysisPermissions';
import {
  generateOilReport,
  listReportAreas,
  listReportContractors,
} from '../../modules/oil-analysis/report.service';
import type {
  OilReportFilters,
  OilReportType,
  OilReportOutput,
} from '../../modules/oil-analysis/report.service';
import { exportReportCsv, exportReportJson } from '../../modules/oil-analysis/report-export';
import type { TrendDirection } from '../../modules/trend-engine';
import {
  isCsvExportEnabled,
  isJsonExportEnabled,
  getVisibleLabReportParamColumns,
} from '../../modules/oil-analysis/settings-guards';
import type { OilAnalysisParameterId } from '../../modules/oil-analysis/settings-types';

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatNum(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return String(value);
}

const COPY = {
  title:        { en: 'Reports',                    ar: 'التقارير' },
  desc:         { en: 'Generate engineering and operational reports from oil analysis data.', ar: 'إنشاء تقارير هندسية وتشغيلية من بيانات تحليل الزيت.' },
  liveData:     { en: 'Live data',                  ar: 'بيانات حية' },
  selReport:    { en: 'Report',                     ar: 'التقرير' },
  dateFrom:     { en: 'Date From',                  ar: 'من تاريخ' },
  dateTo:       { en: 'Date To',                    ar: 'إلى تاريخ' },
  filterArea:   { en: 'All Areas',                  ar: 'جميع المناطق' },
  filterContr:  { en: 'All Contractors',            ar: 'جميع المقاولين' },
  filterCond:   { en: 'All Conditions',             ar: 'جميع الحالات' },
  equipSearch:  { en: 'Search equipment, LP, sample…', ar: 'ابحث عن معدة أو نقطة أو عينة…' },
  btnCsv:       { en: 'Export CSV',                 ar: 'تصدير CSV' },
  btnJson:      { en: 'Export JSON',                ar: 'تصدير JSON' },
  empty:        { en: 'No records match the current filters.', ar: 'لا توجد سجلات تطابق المرشحات الحالية.' },
  repSummary:   { en: 'Sample Summary',             ar: 'ملخص العينات' },
  repCritical:  { en: 'Critical Samples',           ar: 'العينات الحرجة' },
  repPending:   { en: 'Pending Review',             ar: 'بانتظار المراجعة' },
  repLab:       { en: 'Laboratory Results',         ar: 'نتائج المختبر' },
  repHealth:    { en: 'Oil Health by Equipment',    ar: 'صحة الزيت حسب المعدة' },
  kpiSamples:   { en: 'Samples',                    ar: 'العينات' },
  kpiEquip:     { en: 'Equipment',                  ar: 'المعدات' },
  kpiAreas:     { en: 'Areas',                      ar: 'المناطق' },
  kpiContr:     { en: 'Contractors',                ar: 'المقاولين' },
  kpiCritical:  { en: 'Critical / Caution',         ar: 'حرج / تحذير' },
  kpiCritOnly:  { en: 'Critical',                   ar: 'حرج' },
  kpiCaution:   { en: 'Caution',                    ar: 'تحذير' },
  kpiPending:   { en: 'Pending Items',              ar: 'عناصر معلقة' },
  kpiPdf:       { en: 'PDF Pending',                ar: 'PDF معلق' },
  kpiMissingLp: { en: 'Missing LP',                 ar: 'نقطة مفقودة' },
  kpiApproved:  { en: 'Approved Results',           ar: 'نتائج معتمدة' },
  kpiHealth:    { en: 'Equipment / LP',             ar: 'معدة / نقطة' },
  secBreakdown: { en: 'Breakdown',                  ar: 'التفصيل' },
  secResults:   { en: 'Report Data',                ar: 'بيانات التقرير' },
  grpEquip:     { en: 'By Equipment',               ar: 'حسب المعدة' },
  grpArea:      { en: 'By Area',                    ar: 'حسب المنطقة' },
  grpContr:     { en: 'By Contractor',              ar: 'حسب المقاول' },
  grpStatus:    { en: 'By Status',                  ar: 'حسب الحالة' },
  grpCond:      { en: 'By Condition',               ar: 'حسب الحالة الفنية' },
  colKey:       { en: 'Group',                      ar: 'المجموعة' },
  colCount:     { en: 'Count',                      ar: 'العدد' },
  colSample:    { en: 'Sample ID',                  ar: 'معرّف العينة' },
  colEquip:     { en: 'Equipment',                  ar: 'المعدة' },
  colLp:        { en: 'LP',                         ar: 'النقطة' },
  colLab:       { en: 'Lab Sample ID',              ar: 'معرّف المختبر' },
  colDate:      { en: 'Sample Date',                ar: 'تاريخ العينة' },
  colAlert:     { en: 'Alert Type',                 ar: 'نوع التنبيه' },
  colCond:      { en: 'Condition',                  ar: 'الحالة' },
  colAbnormal:  { en: 'Abnormal Fields',            ar: 'حقول شاذة' },
  colApproval:  { en: 'Approval',                   ar: 'الاعتماد' },
  colStatus:    { en: 'Status',                     ar: 'الحالة' },
  colPdf:       { en: 'PDF Status',                 ar: 'حالة PDF' },
  colReason:    { en: 'Pending Reason',             ar: 'سبب الانتظار' },
  colIron:      { en: 'Iron',                       ar: 'الحديد' },
  colCopper:    { en: 'Copper',                     ar: 'النحاس' },
  colSilicon:   { en: 'Silicon',                    ar: 'السيليكون' },
  colWater:     { en: 'Water %',                    ar: 'الماء %' },
  colPq:        { en: 'PQ Index',                   ar: 'مؤشر PQ' },
  colVis:       { en: 'Viscosity',                  ar: 'اللزوجة' },
  colTan:       { en: 'TAN',                        ar: 'TAN' },
  colOx:        { en: 'Oxidation',                  ar: 'الأكسدة' },
  colParticle:  { en: 'Particle Count',             ar: 'عدد الجسيمات' },
  colTrend:     { en: 'Trend',                      ar: 'الاتجاه' },
  condPending:  { en: 'Pending',                    ar: 'معلّق' },
  condNormal:   { en: 'Normal',                     ar: 'طبيعي' },
  condMonitor:  { en: 'Monitor',                    ar: 'مراقبة' },
  condCaution:  { en: 'Caution',                    ar: 'تحذير' },
  condCritical: { en: 'Critical',                   ar: 'حرج' },
} as const;

const REPORT_OPTIONS: readonly { id: OilReportType; label: L10n<string> }[] = [
  { id: 'sample-summary',     label: COPY.repSummary },
  { id: 'critical-samples',   label: COPY.repCritical },
  { id: 'pending-review',     label: COPY.repPending },
  { id: 'laboratory-results', label: COPY.repLab },
  { id: 'oil-health',         label: COPY.repHealth },
];

const CONDITION_OPTIONS: readonly { id: string; label: L10n<string> }[] = [
  { id: '',          label: COPY.filterCond },
  { id: 'pending',   label: COPY.condPending },
  { id: 'normal',    label: COPY.condNormal },
  { id: 'monitor',   label: COPY.condMonitor },
  { id: 'caution',   label: COPY.condCaution },
  { id: 'critical',  label: COPY.condCritical },
];

const TREND_LABELS: Record<TrendDirection, L10n<string>> = {
  stable:           { en: 'Stable',          ar: 'مستقر' },
  improving:        { en: 'Improving',       ar: 'يتحسن' },
  rising:           { en: 'Rising',          ar: 'مرتفع' },
  'rapidly-rising': { en: 'Rapidly Rising',  ar: 'يرتفع بسرعة' },
  'sudden-change':  { en: 'Sudden Change',   ar: 'تغير مفاجئ' },
};

function kpiLabel(key: string, locale: string): string {
  const map: Record<string, L10n<string>> = {
    samples:          COPY.kpiSamples,
    equipment:        COPY.kpiEquip,
    areas:            COPY.kpiAreas,
    contractors:      COPY.kpiContr,
    'critical/caution': COPY.kpiCritical,
    critical:         COPY.kpiCritOnly,
    caution:          COPY.kpiCaution,
    pending:          COPY.kpiPending,
    'pdf-pending':      COPY.kpiPdf,
    'missing-lp':       COPY.kpiMissingLp,
    'approved-results': COPY.kpiApproved,
    'equipment-lp':     COPY.kpiHealth,
  };
  return map[key] ? t(map[key]!, locale) : key;
}

function kpiModifier(key: string): 'neutral' | 'info' | 'warning' | 'caution' {
  if (key === 'critical' || key === 'critical/caution') return 'caution';
  if (key === 'caution' || key === 'pdf-pending' || key === 'missing-lp') return 'warning';
  if (key === 'pending') return 'warning';
  return 'info';
}

const LAB_PARAM_COLUMN_LABELS: Record<OilAnalysisParameterId, L10n<string>> = {
  iron:          COPY.colIron,
  copper:        COPY.colCopper,
  silicon:       COPY.colSilicon,
  water:         COPY.colWater,
  pqIndex:       COPY.colPq,
  viscosity:     COPY.colVis,
  tan:           COPY.colTan,
  oxidation:     COPY.colOx,
  particleCount: COPY.colParticle,
};

function labParamCellValue(
  row: {
    readonly ironPpm: number | null;
    readonly copperPpm: number | null;
    readonly siliconPpm: number | null;
    readonly waterPercent: number | null;
    readonly pqIndex: number | null;
    readonly viscosity100c: number | null;
    readonly tan: number | null;
    readonly oxidation: number | null;
    readonly particleCount: number | null;
  },
  id: OilAnalysisParameterId,
): string {
  switch (id) {
    case 'iron': return formatNum(row.ironPpm);
    case 'copper': return formatNum(row.copperPpm);
    case 'silicon': return formatNum(row.siliconPpm);
    case 'water': return formatNum(row.waterPercent);
    case 'pqIndex': return formatNum(row.pqIndex);
    case 'viscosity': return formatNum(row.viscosity100c);
    case 'tan': return formatNum(row.tan);
    case 'oxidation': return formatNum(row.oxidation);
    case 'particleCount': return formatNum(row.particleCount);
    default: return '—';
  }
}

interface BreakdownTableProps {
  readonly title: string;
  readonly rows: readonly { key: string; count: number }[];
}

function BreakdownTable({ title, rows }: BreakdownTableProps): React.ReactElement {
  const { locale } = useLanguage();
  const l = (b: L10n<string>) => t(b, locale);

  return (
    <div className="oa-report-breakdown">
      <h3 className="oa-report-breakdown__title">{title}</h3>
      {rows.length === 0 ? (
        <p className="db-panel__empty">—</p>
      ) : (
        <table className="ur-table oc-table oa-report-table">
          <thead>
            <tr>
              <th>{l(COPY.colKey)}</th>
              <th>{l(COPY.colCount)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>{row.key}</td>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ReportBody({ output }: { output: OilReportOutput }): React.ReactElement {
  const { locale } = useLanguage();
  const l = (b: L10n<string>) => t(b, locale);
  const { report } = output;

  if (report.kind === 'sample-summary') {
    return (
      <div className="oa-report-breakdowns">
        <BreakdownTable title={l(COPY.grpEquip)} rows={report.byEquipment} />
        <BreakdownTable title={l(COPY.grpArea)} rows={report.byArea} />
        <BreakdownTable title={l(COPY.grpContr)} rows={report.byContractor} />
        <BreakdownTable title={l(COPY.grpStatus)} rows={report.byStatus} />
        <BreakdownTable title={l(COPY.grpCond)} rows={report.byCondition} />
      </div>
    );
  }

  if (report.kind === 'critical-samples') {
    if (report.rows.length === 0) return <p className="db-panel__empty">{l(COPY.empty)}</p>;
    return (
      <table className="ur-table oc-table oa-report-table">
        <thead>
          <tr>
            <th>{l(COPY.colSample)}</th>
            <th>{l(COPY.colEquip)}</th>
            <th>{l(COPY.colLp)}</th>
            <th>{l(COPY.colLab)}</th>
            <th>{l(COPY.colDate)}</th>
            <th>{l(COPY.colAlert)}</th>
            <th>{l(COPY.colCond)}</th>
            <th>{l(COPY.colAbnormal)}</th>
            <th>{l(COPY.colApproval)}</th>
          </tr>
        </thead>
        <tbody>
          {report.rows.map((row) => (
            <tr key={row.sampleId}>
              <td>{row.sampleId}</td>
              <td>{row.equipmentId}</td>
              <td>{row.lubricationPointId}</td>
              <td>{row.labSampleId}</td>
              <td>{formatDate(row.sampledAt)}</td>
              <td>{row.alertType}</td>
              <td>{row.condition}</td>
              <td>{row.abnormalFields}</td>
              <td>{row.approvalStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (report.kind === 'pending-review') {
    if (report.rows.length === 0) return <p className="db-panel__empty">{l(COPY.empty)}</p>;
    return (
      <table className="ur-table oc-table oa-report-table">
        <thead>
          <tr>
            <th>{l(COPY.colSample)}</th>
            <th>{l(COPY.colEquip)}</th>
            <th>{l(COPY.colLp)}</th>
            <th>{l(COPY.colLab)}</th>
            <th>{l(COPY.colDate)}</th>
            <th>{l(COPY.colStatus)}</th>
            <th>{l(COPY.colApproval)}</th>
            <th>{l(COPY.colPdf)}</th>
            <th>{l(COPY.colReason)}</th>
          </tr>
        </thead>
        <tbody>
          {report.rows.map((row) => (
            <tr key={row.sampleId}>
              <td>{row.sampleId}</td>
              <td>{row.equipmentId}</td>
              <td>{row.lubricationPointId}</td>
              <td>{row.labSampleId}</td>
              <td>{formatDate(row.sampledAt)}</td>
              <td>{row.status}</td>
              <td>{row.approvalStatus}</td>
              <td>{row.pdfImportStatus}</td>
              <td>{row.pendingReason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (report.kind === 'laboratory-results') {
    if (report.rows.length === 0) return <p className="db-panel__empty">{l(COPY.empty)}</p>;
    const paramColumns = getVisibleLabReportParamColumns();
    return (
      <div className="oa-report-table-wrap">
        <table className="ur-table oc-table oa-report-table oa-report-table--wide">
          <thead>
            <tr>
              <th>{l(COPY.colSample)}</th>
              <th>{l(COPY.colEquip)}</th>
              <th>{l(COPY.colLp)}</th>
              <th>{l(COPY.colLab)}</th>
              <th>{l(COPY.colDate)}</th>
              {paramColumns.map((col) => (
                <th key={col.id}>{l(LAB_PARAM_COLUMN_LABELS[col.id])}</th>
              ))}
              <th>{l(COPY.colApproval)}</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => (
              <tr key={row.sampleId}>
                <td>{row.sampleId}</td>
                <td>{row.equipmentId}</td>
                <td>{row.lubricationPointId}</td>
                <td>{row.labSampleId}</td>
                <td>{formatDate(row.sampledAt)}</td>
                {paramColumns.map((col) => (
                  <td key={col.id}>{labParamCellValue(row, col.id)}</td>
                ))}
                <td>{row.approvalStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (report.kind === 'oil-health') {
    if (report.rows.length === 0) return <p className="db-panel__empty">{l(COPY.empty)}</p>;
    return (
      <table className="ur-table oc-table oa-report-table">
        <thead>
          <tr>
            <th>{l(COPY.colEquip)}</th>
            <th>{l(COPY.colLp)}</th>
            <th>{l(COPY.colSample)}</th>
            <th>{l(COPY.colLab)}</th>
            <th>{l(COPY.colCond)}</th>
            <th>{l(COPY.colDate)}</th>
            <th>{l(COPY.colTrend)}</th>
          </tr>
        </thead>
        <tbody>
          {report.rows.map((row) => (
            <tr key={`${row.equipmentId}-${row.lubricationPointId}`}>
              <td>{row.equipmentId}</td>
              <td>{row.lubricationPointId}</td>
              <td>{row.sampleId}</td>
              <td>{row.labSampleId}</td>
              <td>{row.condition}</td>
              <td>{formatDate(row.lastSampleDate)}</td>
              <td>
                {row.trendDirection
                  ? l(TREND_LABELS[row.trendDirection])
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return <p className="db-panel__empty">{l(COPY.empty)}</p>;
}

function hasReportData(output: OilReportOutput): boolean {
  const { report } = output;
  switch (report.kind) {
    case 'sample-summary':
      return report.sampleCount > 0;
    default:
      return report.rows.length > 0;
  }
}

export default function Reports(): React.ReactElement {
  const { locale } = useLanguage();
  const l = (b: L10n<string>) => t(b, locale);
  const permissions = useOilAnalysisPermissions();

  const areas = useMemo(() => listReportAreas(), []);
  const contractors = useMemo(() => listReportContractors(), []);

  const [reportType, setReportType] = useState<OilReportType>('sample-summary');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [area, setArea] = useState('');
  const [contractor, setContractor] = useState('');
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [condition, setCondition] = useState('');

  const filters: OilReportFilters = useMemo(() => ({
    reportType,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    area: area || undefined,
    contractor: contractor || undefined,
    equipmentSearch: equipmentSearch || undefined,
    condition: condition || undefined,
  }), [reportType, dateFrom, dateTo, area, contractor, equipmentSearch, condition]);

  const output = useMemo(() => generateOilReport(filters), [filters]);

  const hasData = hasReportData(output);
  const csvExportEnabled = isCsvExportEnabled();
  const jsonExportEnabled = isJsonExportEnabled();

  return (
    <div className="ur-page oa-report-page">
      <header className="ur-page__header">
        <div className="ur-page__header-text">
          <h1 className="ur-page__title">{l(COPY.title)}</h1>
          <p className="ur-page__desc">{l(COPY.desc)}</p>
        </div>
        <StatusChip status="operational" label={l(COPY.liveData)} />
      </header>

      <div className="oa-trend-toolbar ol-explorer-toolbar">
        <div className="ol-explorer-filters">
          <label className="oa-trend-field">
            <span className="oa-trend-field__label">{l(COPY.selReport)}</span>
            <select
              className="ol-explorer-select"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as OilReportType)}
            >
              {REPORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{l(opt.label)}</option>
              ))}
            </select>
          </label>

          <label className="oa-trend-field">
            <span className="oa-trend-field__label">{l(COPY.dateFrom)}</span>
            <input
              type="date"
              className="ur-form-input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>

          <label className="oa-trend-field">
            <span className="oa-trend-field__label">{l(COPY.dateTo)}</span>
            <input
              type="date"
              className="ur-form-input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>

          <label className="oa-trend-field">
            <span className="oa-trend-field__label">{l(COPY.filterArea)}</span>
            <select className="ol-explorer-select" value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="">{l(COPY.filterArea)}</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>

          <label className="oa-trend-field">
            <span className="oa-trend-field__label">{l(COPY.filterContr)}</span>
            <select className="ol-explorer-select" value={contractor} onChange={(e) => setContractor(e.target.value)}>
              <option value="">{l(COPY.filterContr)}</option>
              {contractors.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label className="oa-trend-field">
            <span className="oa-trend-field__label">{l(COPY.filterCond)}</span>
            <select className="ol-explorer-select" value={condition} onChange={(e) => setCondition(e.target.value)}>
              {CONDITION_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{l(opt.label)}</option>
              ))}
            </select>
          </label>

          <label className="oa-trend-field oa-trend-field--search">
            <span className="oa-trend-field__label">{l(COPY.equipSearch)}</span>
            <input
              type="search"
              className="ol-explorer-search"
              placeholder={l(COPY.equipSearch)}
              value={equipmentSearch}
              onChange={(e) => setEquipmentSearch(e.target.value)}
            />
          </label>
        </div>

        <div className="oa-report-actions">
          <OilAnalysisActionButton
            type="button"
            className="ur-btn ur-btn--ghost ur-btn--sm"
            allowed={permissions.canExportReports}
            disabled={!hasData || !csvExportEnabled}
            onClick={() => exportReportCsv(output)}
          >
            {l(COPY.btnCsv)}
          </OilAnalysisActionButton>
          <OilAnalysisActionButton
            type="button"
            className="ur-btn ur-btn--ghost ur-btn--sm"
            allowed={permissions.canExportReports}
            disabled={!hasData || !jsonExportEnabled}
            onClick={() => exportReportJson(output)}
          >
            {l(COPY.btnJson)}
          </OilAnalysisActionButton>
        </div>
      </div>

      <div className="ur-summary-grid">
        {output.kpis.map((kpi) => (
          <SummaryCard
            key={kpi.label}
            value={String(kpi.value)}
            label={kpiLabel(kpi.label, locale)}
            modifier={kpiModifier(kpi.label)}
          />
        ))}
      </div>

      <section className="dashboard-section">
        <h2 className="dashboard-section__title">{l(COPY.secResults)}</h2>
        <div className="db-panel">
          <div className="db-panel__body">
            <ReportBody output={output} />
          </div>
        </div>
      </section>
    </div>
  );
}
