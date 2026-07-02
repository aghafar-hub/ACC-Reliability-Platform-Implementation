// apps/owner-center/src/pages/oil-analysis/SampleRegistry.tsx
// Oil Analysis — Sample Registry (Sprint 02).

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { StatusChip } from '../../components/StatusChip';
import type { ChipStatus } from '../../components/StatusChip';
import { SummaryCard } from '../../components/SummaryCard';
import {
  oilSampleService,
  computeSampleCondition,
  hasLabResults,
} from '../../modules/oil-analysis/sample.service';
import type { OilSampleRow, OilSampleRowStatus, OilLabResultStatus } from '../../modules/oil-analysis/sample.service';

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

function distinct(values: readonly string[]): string[] {
  return [...new Set(values.filter((v) => v.trim().length > 0))].sort();
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const COPY = {
  title:       { en: 'Sample Registry',     ar: 'سجل العينات' },
  desc:        { en: 'Search, filter, and review oil analysis sample records.', ar: 'البحث والتصفية ومراجعة سجلات عينات تحليل الزيت.' },
  liveData:    { en: 'Live data',           ar: 'بيانات حية' },
  addLink:     { en: '+ New Sample Intake', ar: '+ استقبال عينة جديدة' },
  searchPh:    { en: 'Search by equipment, lab ID, sample code, location…', ar: 'ابحث بالمعدة أو معرّف المختبر أو رمز العينة أو الموقع…' },
  filterStatus:{ en: 'All Statuses',        ar: 'جميع الحالات' },
  filterArea:  { en: 'All Areas',         ar: 'جميع المناطق' },
  filterContr: { en: 'All Contractors',   ar: 'جميع المقاولين' },
  filterCond:  { en: 'All Conditions',    ar: 'جميع الحالات' },
  sumTotal:    { en: 'Total',             ar: 'الإجمالي' },
  sumPending:  { en: 'Pending Review',    ar: 'بانتظار المراجعة' },
  sumLpMap:    { en: 'Needs LP Mapping',  ar: 'تحتاج ربط نقطة' },
  sumCritical: { en: 'Critical',          ar: 'حرج' },
  colSample:   { en: 'Sample ID',         ar: 'معرّف العينة' },
  colLabId:    { en: 'Lab Sample ID',     ar: 'معرّف المختبر' },
  colEquip:    { en: 'Equipment ID',      ar: 'معرّف المعدة' },
  colLp:       { en: 'LP ID',             ar: 'رمز النقطة' },
  colDate:     { en: 'Sample Date',       ar: 'تاريخ العينة' },
  colArea:     { en: 'Area',              ar: 'المنطقة' },
  colContr:    { en: 'Contractor',        ar: 'المقاول' },
  colStatus:   { en: 'Status',            ar: 'الحالة' },
  colCond:     { en: 'Condition',         ar: 'الحالة الفنية' },
  empty:       { en: 'No samples found. Adjust filters or register the first sample via Intake.', ar: 'لم يتم العثور على عينات. عدّل المرشحات أو سجّل أول عينة عبر الاستقبال.' },
  selectRow:   { en: 'Select a row to view sample details.', ar: 'اختر صفاً لعرض تفاصيل العينة.' },
  dpTitle:     { en: 'Sample Detail',       ar: 'تفاصيل العينة' },
  dpClose:     { en: 'Close',               ar: 'إغلاق' },
  dpEquip:     { en: 'Equipment ID',        ar: 'معرّف المعدة' },
  dpLp:        { en: 'LP ID',               ar: 'رمز النقطة' },
  dpLab:       { en: 'Lab Sample ID',       ar: 'معرّف المختبر' },
  dpDate:      { en: 'Sample Date',         ar: 'تاريخ العينة' },
  dpLub:       { en: 'Lubricant',           ar: 'زيت التشحيم' },
  dpContr:     { en: 'Contractor',          ar: 'المقاول' },
  dpArea:      { en: 'Area',                ar: 'المنطقة' },
  dpLoc:       { en: 'Sampling Location',   ar: 'موقع أخذ العينة' },
  dpStatus:    { en: 'Status',              ar: 'الحالة' },
  dpCond:      { en: 'Condition',           ar: 'الحالة الفنية' },
  dpNotes:     { en: 'Notes',               ar: 'ملاحظات' },
  dpNone:      { en: '—',                   ar: '—' },
  condPending: { en: 'Pending',             ar: 'معلّق' },
  condNormal:  { en: 'Normal',              ar: 'طبيعي' },
  condCaution: { en: 'Caution',             ar: 'تحذير' },
  condAlert:   { en: 'Alert',               ar: 'تنبيه' },
  dpResult:    { en: 'Result Status',       ar: 'حالة النتيجة' },
  dpLabSec:    { en: 'Lab Results',         ar: 'نتائج المختبر' },
  dpContam:    { en: 'Contamination Rating', ar: 'تصنيف التلوث' },
  dpEquipR:    { en: 'Equipment Rating',    ar: 'تصنيف المعدة' },
  dpLubR:      { en: 'Lubricant Rating',    ar: 'تصنيف الزيت' },
  dpPq:        { en: 'PQ Index',            ar: 'مؤشر PQ' },
  dpVis:       { en: 'Viscosity @ 100°C',   ar: 'اللزوجة @ 100°م' },
  dpTan:       { en: 'TAN',                 ar: 'TAN' },
  dpOx:        { en: 'Oxidation',           ar: 'الأكسدة' },
  dpWater:     { en: 'Water %',             ar: 'نسبة الماء %' },
  dpP4:        { en: 'Particles > 4µm',     ar: 'جسيمات > 4µm' },
  dpP6:        { en: 'Particles > 6µm',     ar: 'جسيمات > 6µm' },
  dpP14:       { en: 'Particles > 14µm',    ar: 'جسيمات > 14µm' },
  dpAnalysis:  { en: 'Sample Analysis',     ar: 'تحليل العينة' },
  dpAlertType: { en: 'Alert Type',          ar: 'نوع التنبيه' },
  rsNormal:    { en: 'Normal',              ar: 'طبيعي' },
  rsMonitor:   { en: 'Monitor',             ar: 'مراقبة' },
  rsCaution:   { en: 'Caution',             ar: 'تحذير' },
  rsCritical:  { en: 'Critical',            ar: 'حرج' },
} as const;

const RESULT_STATUS_LABELS: Record<OilLabResultStatus, L10n<string>> = {
  normal:   COPY.rsNormal,
  monitor:  COPY.rsMonitor,
  caution:  COPY.rsCaution,
  critical: COPY.rsCritical,
};

function formatNum(value: number | null): string {
  return value === null ? '—' : String(value);
}

function resultStatusChip(status: OilLabResultStatus): ChipStatus {
  switch (status) {
    case 'critical': return 'critical';
    case 'caution':  return 'warning';
    case 'monitor':  return 'maintenance';
    default:         return 'operational';
  }
}

const STATUS_LABELS: Record<OilSampleRowStatus, L10n<string>> = {
  'imported':         { en: 'Imported',         ar: 'مستورد' },
  'pending-review':   { en: 'Pending Review',   ar: 'بانتظار المراجعة' },
  'needs-lp-mapping': { en: 'Needs LP Mapping', ar: 'يحتاج ربط نقطة' },
  'linked':           { en: 'Linked',           ar: 'مرتبط' },
  'analysed':         { en: 'Analysed',         ar: 'تم التحليل' },
  'normal':           { en: 'Normal',           ar: 'طبيعي' },
  'caution':          { en: 'Caution',          ar: 'تحذير' },
  'alert':            { en: 'Alert',            ar: 'تنبيه' },
  'cancelled':        { en: 'Cancelled',        ar: 'ملغى' },
};

function statusChip(status: OilSampleRowStatus): { chip: ChipStatus; label: L10n<string> } {
  switch (status) {
    case 'alert':
    case 'cancelled':
      return { chip: 'critical', label: STATUS_LABELS[status] };
    case 'caution':
    case 'pending-review':
    case 'needs-lp-mapping':
      return { chip: 'warning', label: STATUS_LABELS[status] };
    case 'linked':
    case 'imported':
      return { chip: 'maintenance', label: STATUS_LABELS[status] };
    case 'analysed':
    case 'normal':
      return { chip: 'operational', label: STATUS_LABELS[status] };
    default:
      return { chip: 'draft', label: STATUS_LABELS[status] };
  }
}

function conditionLabel(cond: ReturnType<typeof computeSampleCondition>): L10n<string> {
  switch (cond) {
    case 'normal':  return COPY.condNormal;
    case 'caution': return COPY.condCaution;
    case 'alert':   return COPY.condAlert;
    default:        return COPY.condPending;
  }
}

function conditionChip(cond: ReturnType<typeof computeSampleCondition>): ChipStatus {
  switch (cond) {
    case 'alert':   return 'critical';
    case 'caution': return 'warning';
    case 'normal':  return 'operational';
    default:        return 'draft';
  }
}

interface DetailPanelProps {
  readonly row: OilSampleRow;
  readonly locale: string;
  readonly onClose: () => void;
}

function SampleDetailPanel({ row, locale, onClose }: DetailPanelProps): React.ReactElement {
  const l = (b: L10n<string>) => t(b, locale);
  const sc = statusChip(row.status);
  const cond = computeSampleCondition(row);

  return (
    <aside className="oc-detail-panel" aria-label={l(COPY.dpTitle)}>
      <div className="oc-detail-panel__head">
        <span className="oc-detail-panel__title">{l(COPY.dpTitle)}</span>
        <button type="button" className="ur-btn ur-btn--ghost ur-btn--sm" onClick={onClose}>
          {l(COPY.dpClose)}
        </button>
      </div>
      <div className="oc-detail-panel__status-row">
        <span className="ur-badge ur-badge--sm">{row.sampleId}</span>
        <StatusChip status={sc.chip} label={l(sc.label)} />
      </div>
      <dl className="oc-detail-panel__fields">
        <div className="oc-detail-panel__field">
          <dt>{l(COPY.dpEquip)}</dt>
          <dd className="oc-detail-panel__equip-id">{row.equipmentId}</dd>
        </div>
        <div className="oc-detail-panel__field">
          <dt>{l(COPY.dpLp)}</dt>
          <dd>{row.lubricationPointId ?? l(COPY.dpNone)}</dd>
        </div>
        <div className="oc-detail-panel__field">
          <dt>{l(COPY.dpLab)}</dt>
          <dd>{row.labSampleId}</dd>
        </div>
        <div className="oc-detail-panel__field">
          <dt>{l(COPY.dpDate)}</dt>
          <dd>{formatDate(row.sampledAt)}</dd>
        </div>
        <div className="oc-detail-panel__field">
          <dt>{l(COPY.dpLub)}</dt>
          <dd>{row.lubricant || l(COPY.dpNone)}</dd>
        </div>
        <div className="oc-detail-panel__field">
          <dt>{l(COPY.dpContr)}</dt>
          <dd>{row.contractorId || l(COPY.dpNone)}</dd>
        </div>
        <div className="oc-detail-panel__field">
          <dt>{l(COPY.dpArea)}</dt>
          <dd>{row.area || l(COPY.dpNone)}</dd>
        </div>
        <div className="oc-detail-panel__field">
          <dt>{l(COPY.dpLoc)}</dt>
          <dd>{row.samplingLocation || l(COPY.dpNone)}</dd>
        </div>
        <div className="oc-detail-panel__field">
          <dt>{l(COPY.dpStatus)}</dt>
          <dd><StatusChip status={sc.chip} label={l(sc.label)} /></dd>
        </div>
        <div className="oc-detail-panel__field">
          <dt>{l(COPY.dpCond)}</dt>
          <dd><StatusChip status={conditionChip(cond)} label={l(conditionLabel(cond))} /></dd>
        </div>
        {row.resultStatus && (
          <div className="oc-detail-panel__field">
            <dt>{l(COPY.dpResult)}</dt>
            <dd>
              <StatusChip
                status={resultStatusChip(row.resultStatus)}
                label={l(RESULT_STATUS_LABELS[row.resultStatus])}
              />
            </dd>
          </div>
        )}
        <div className="oc-detail-panel__field">
          <dt>{l(COPY.dpNotes)}</dt>
          <dd>{row.notes || l(COPY.dpNone)}</dd>
        </div>
        {hasLabResults(row) && (
          <>
            <div className="oc-detail-panel__field">
              <dt>{l(COPY.dpLabSec)}</dt>
              <dd />
            </div>
            <div className="oc-detail-panel__field">
              <dt>{l(COPY.dpContam)}</dt>
              <dd>{row.contaminationRating || l(COPY.dpNone)}</dd>
            </div>
            <div className="oc-detail-panel__field">
              <dt>{l(COPY.dpEquipR)}</dt>
              <dd>{row.equipmentRating || l(COPY.dpNone)}</dd>
            </div>
            <div className="oc-detail-panel__field">
              <dt>{l(COPY.dpLubR)}</dt>
              <dd>{row.lubricantRating || l(COPY.dpNone)}</dd>
            </div>
            <div className="oc-detail-panel__field">
              <dt>{l(COPY.dpPq)}</dt>
              <dd>{formatNum(row.pqIndex)}</dd>
            </div>
            <div className="oc-detail-panel__field">
              <dt>{l(COPY.dpVis)}</dt>
              <dd>{formatNum(row.viscosity100c)}</dd>
            </div>
            <div className="oc-detail-panel__field">
              <dt>{l(COPY.dpTan)}</dt>
              <dd>{formatNum(row.tan)}</dd>
            </div>
            <div className="oc-detail-panel__field">
              <dt>{l(COPY.dpOx)}</dt>
              <dd>{formatNum(row.oxidation)}</dd>
            </div>
            <div className="oc-detail-panel__field">
              <dt>{l(COPY.dpWater)}</dt>
              <dd>{formatNum(row.waterPercent)}</dd>
            </div>
            <div className="oc-detail-panel__field">
              <dt>{l(COPY.dpP4)}</dt>
              <dd>{formatNum(row.particle4)}</dd>
            </div>
            <div className="oc-detail-panel__field">
              <dt>{l(COPY.dpP6)}</dt>
              <dd>{formatNum(row.particle6)}</dd>
            </div>
            <div className="oc-detail-panel__field">
              <dt>{l(COPY.dpP14)}</dt>
              <dd>{formatNum(row.particle14)}</dd>
            </div>
            <div className="oc-detail-panel__field">
              <dt>{l(COPY.dpAlertType)}</dt>
              <dd>{row.alertType || l(COPY.dpNone)}</dd>
            </div>
            <div className="oc-detail-panel__field">
              <dt>{l(COPY.dpAnalysis)}</dt>
              <dd>{row.sampleAnalysis || l(COPY.dpNone)}</dd>
            </div>
          </>
        )}
      </dl>
    </aside>
  );
}

export default function SampleRegistry(): React.ReactElement {
  const { locale } = useLanguage();
  const l = (b: L10n<string>) => t(b, locale);

  const rows = oilSampleService.list();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterContractor, setFilterContractor] = useState('');
  const [filterCondition, setFilterCondition] = useState('');

  const areas = useMemo(() => distinct(rows.map((r) => r.area)), [rows]);
  const contractors = useMemo(() => distinct(rows.map((r) => r.contractorId)), [rows]);
  const statuses = useMemo(
    () => distinct(rows.map((r) => r.status)),
    [rows],
  );

  const filtered = useMemo(
    () =>
      oilSampleService.filter({
        search,
        status: filterStatus || undefined,
        area: filterArea || undefined,
        contractor: filterContractor || undefined,
        condition: filterCondition || undefined,
      }),
    [search, filterStatus, filterArea, filterContractor, filterCondition],
  );

  const kpis = useMemo(() => oilSampleService.computeRegistryKpis(filtered), [filtered]);
  const selected = selectedId ? oilSampleService.findById(selectedId) : null;
  const hasDetail = selected !== null;

  return (
    <div className="ur-page oc-page">
      <div className="ur-page__header">
        <div className="ur-page__header-text">
          <h1 className="ur-page__title">{l(COPY.title)}</h1>
          <p className="ur-page__desc">{l(COPY.desc)}</p>
        </div>
        <StatusChip status="operational" label={l(COPY.liveData)} className="ur-page__sdk-badge" />
      </div>

      <div className="ur-summary-grid">
        <SummaryCard value={String(kpis.total)}        label={l(COPY.sumTotal)}   modifier="neutral" />
        <SummaryCard value={String(kpis.pendingReview)} label={l(COPY.sumPending)} modifier="caution" />
        <SummaryCard value={String(kpis.needsLpMapping)} label={l(COPY.sumLpMap)} modifier="warning" />
        <SummaryCard value={String(kpis.critical)}     label={l(COPY.sumCritical)} modifier="warning" />
      </div>

      <div className="oc-toolbar">
        <input
          className="ur-form-input oc-toolbar__search"
          type="search"
          placeholder={l(COPY.searchPh)}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={l(COPY.searchPh)}
        />
        <div className="oc-toolbar__dropdowns">
          <select
            className="ur-form-input oc-toolbar__select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label={l(COPY.filterStatus)}
          >
            <option value="">{l(COPY.filterStatus)}</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{l(STATUS_LABELS[s as OilSampleRowStatus] ?? { en: s, ar: s })}</option>
            ))}
          </select>
          <select
            className="ur-form-input oc-toolbar__select"
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            aria-label={l(COPY.filterArea)}
          >
            <option value="">{l(COPY.filterArea)}</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            className="ur-form-input oc-toolbar__select"
            value={filterContractor}
            onChange={(e) => setFilterContractor(e.target.value)}
            aria-label={l(COPY.filterContr)}
          >
            <option value="">{l(COPY.filterContr)}</option>
            {contractors.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="ur-form-input oc-toolbar__select"
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value)}
            aria-label={l(COPY.filterCond)}
          >
            <option value="">{l(COPY.filterCond)}</option>
            <option value="pending">{l(COPY.condPending)}</option>
            <option value="normal">{l(COPY.condNormal)}</option>
            <option value="caution">{l(COPY.condCaution)}</option>
            <option value="alert">{l(COPY.condAlert)}</option>
          </select>
        </div>
        <Link to="/oil-analysis/intake" className="ur-btn ur-btn--primary oc-toolbar__record-btn">
          {l(COPY.addLink)}
        </Link>
      </div>

      <div className={`oc-workspace ${hasDetail ? 'oc-workspace--split' : ''}`}>
        <div className="oc-workspace__list">
          <div className="oc-task-list ur-table-wrap">
            <table className="ur-table oc-table" role="grid">
              <thead>
                <tr>
                  <th>{l(COPY.colSample)}</th>
                  <th>{l(COPY.colLabId)}</th>
                  <th>{l(COPY.colEquip)}</th>
                  <th>{l(COPY.colLp)}</th>
                  <th>{l(COPY.colDate)}</th>
                  <th>{l(COPY.colArea)}</th>
                  <th>{l(COPY.colContr)}</th>
                  <th>{l(COPY.colStatus)}</th>
                  <th>{l(COPY.colCond)}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="ur-table__empty">{l(COPY.empty)}</td>
                  </tr>
                ) : (
                  filtered.map((row) => {
                    const sc = statusChip(row.status);
                    const cond = computeSampleCondition(row);
                    const isSelected = row.id === selectedId;
                    return (
                      <tr
                        key={row.id}
                        className={`oc-task-row ${isSelected ? 'oc-task-row--selected' : ''}`}
                        onClick={() => setSelectedId(row.id)}
                        tabIndex={0}
                        role="row"
                        aria-selected={isSelected}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedId(row.id);
                          }
                        }}
                      >
                        <td><span className="ur-badge ur-badge--sm">{row.sampleId}</span></td>
                        <td>{row.labSampleId}</td>
                        <td>
                          <div className="oc-task-row__equip-id">{row.equipmentId}</div>
                        </td>
                        <td>{row.lubricationPointId ?? l(COPY.dpNone)}</td>
                        <td className="ur-table__date">{formatDate(row.sampledAt)}</td>
                        <td>{row.area || l(COPY.dpNone)}</td>
                        <td>
                          {row.contractorId
                            ? <span className="ur-badge ur-badge--sm">{row.contractorId}</span>
                            : l(COPY.dpNone)}
                        </td>
                        <td><StatusChip status={sc.chip} label={l(sc.label)} /></td>
                        <td><StatusChip status={conditionChip(cond)} label={l(conditionLabel(cond))} /></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {!hasDetail && filtered.length > 0 && (
            <p className="oc-workspace__hint">{l(COPY.selectRow)}</p>
          )}
        </div>

        {hasDetail && selected && (
          <SampleDetailPanel
            row={selected}
            locale={locale}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  );
}
