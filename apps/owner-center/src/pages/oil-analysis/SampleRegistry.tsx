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
  isSampleApprovalLocked,
} from '../../modules/oil-analysis/sample.service';
import type { OilSampleRow, OilSampleRowStatus, OilLabResultStatus, PdfImportStatus, OilSampleApprovalStatus, OilSampleApprovalHistoryEntry, OilSampleLpMappingHistoryEntry } from '../../modules/oil-analysis/sample.service';
import { isLabParameterVisible } from '../../modules/oil-analysis/settings-guards';

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
  condMonitor: { en: 'Monitor',             ar: 'مراقبة' },
  condCaution: { en: 'Caution',             ar: 'تحذير' },
  condCritical:{ en: 'Critical',            ar: 'حرج' },
  dpResult:    { en: 'Result Status',       ar: 'حالة النتيجة' },
  dpLabSec:    { en: 'Lab Results',         ar: 'نتائج المختبر' },
  dpContam:    { en: 'Contamination Rating', ar: 'تصنيف التلوث' },
  dpEquipR:    { en: 'Equipment Rating',    ar: 'تصنيف المعدة' },
  dpLubR:      { en: 'Lubricant Rating',    ar: 'تصنيف الزيت' },
  dpIron:      { en: 'Iron (ppm)',          ar: 'الحديد (ppm)' },
  dpCopper:    { en: 'Copper (ppm)',        ar: 'النحاس (ppm)' },
  dpSilicon:   { en: 'Silicon (ppm)',       ar: 'السيليكون (ppm)' },
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
  dpPdfSec:    { en: 'PDF Import',          ar: 'استيراد PDF' },
  dpPdfStatus: { en: 'PDF Status',          ar: 'حالة PDF' },
  dpPdfFile:   { en: 'PDF File',            ar: 'ملف PDF' },
  dpPdfLink:   { en: 'PDF Link',            ar: 'رابط PDF' },
  dpPdfNotes:  { en: 'PDF Review Notes',    ar: 'ملاحظات مراجعة PDF' },
  dpOpenPdf:   { en: 'Open PDF',            ar: 'فتح PDF' },
  dpApproval:  { en: 'Approval Status',     ar: 'حالة الموافقة' },
  dpApprovedBy:{ en: 'Approved By',         ar: 'وُوفق بواسطة' },
  dpApprovedAt:{ en: 'Approved At',         ar: 'تاريخ الموافقة' },
  dpLocked:    { en: 'Lab Values Locked',   ar: 'قيم المختبر مقفلة' },
  dpHistSec:   { en: 'Approval History',    ar: 'سجل الموافقة' },
  dpLpHistSec: { en: 'LP Mapping History',  ar: 'سجل ربط نقطة التشحيم' },
  dpHistEmpty: { en: 'No approval events recorded.', ar: 'لم يُسجَّل أي حدث موافقة.' },
  dpLpHistEmpty:{ en: 'No LP mapping events recorded.', ar: 'لم يُسجَّل أي حدث ربط نقطة.' },
} as const;

const APPROVAL_STATUS_LABELS: Record<OilSampleApprovalStatus, L10n<string>> = {
  pending:        { en: 'Pending',       ar: 'معلّق' },
  'under-review': { en: 'Under Review',  ar: 'قيد المراجعة' },
  approved:       { en: 'Approved',      ar: 'موافق عليه' },
  locked:         { en: 'Locked',        ar: 'مقفل' },
};

const HISTORY_ACTION_LABELS: Record<OilSampleApprovalHistoryEntry['action'], L10n<string>> = {
  opened:                   { en: 'Opened for review',       ar: 'فُتحت للمراجعة' },
  edited:                   { en: 'Edited before approval',  ar: 'عُدِّلت قبل الموافقة' },
  approved:                 { en: 'Approved',                ar: 'وُوفق عليها' },
  rejected:                 { en: 'Rejected',                ar: 'رُفضت' },
  'returned-for-correction': { en: 'Returned for correction', ar: 'أُعيدت للتصحيح' },
  locked:                   { en: 'Locked',                  ar: 'قُفلت' },
};

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function approvalStatusChip(status: OilSampleApprovalStatus): ChipStatus {
  switch (status) {
    case 'locked':
    case 'approved': return 'operational';
    case 'under-review': return 'maintenance';
    case 'pending': return 'warning';
    default: return 'draft';
  }
}

const PDF_STATUS_LABELS: Record<PdfImportStatus, L10n<string>> = {
  none:            { en: 'None',            ar: 'لا يوجد' },
  uploaded:        { en: 'Uploaded',        ar: 'مرفوع' },
  'pending-review':  { en: 'Pending Review',  ar: 'بانتظار المراجعة' },
  reviewed:        { en: 'Reviewed',        ar: 'تمت المراجعة' },
  rejected:        { en: 'Rejected',        ar: 'مرفوض' },
};

function pdfStatusChip(status: PdfImportStatus): ChipStatus {
  switch (status) {
    case 'rejected':       return 'critical';
    case 'pending-review': return 'warning';
    case 'reviewed':       return 'operational';
    case 'uploaded':       return 'maintenance';
    default:               return 'draft';
  }
}

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
    case 'normal':   return COPY.condNormal;
    case 'monitor':  return COPY.condMonitor;
    case 'caution':  return COPY.condCaution;
    case 'critical': return COPY.condCritical;
    default:         return COPY.condPending;
  }
}

function conditionChip(cond: ReturnType<typeof computeSampleCondition>): ChipStatus {
  switch (cond) {
    case 'critical': return 'critical';
    case 'caution':  return 'warning';
    case 'monitor':  return 'maintenance';
    case 'normal':   return 'operational';
    default:         return 'draft';
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
        {row.pdfImportStatus !== 'none' && (
          <>
            <div className="oc-detail-panel__field">
              <dt>{l(COPY.dpPdfSec)}</dt>
              <dd />
            </div>
            <div className="oc-detail-panel__field">
              <dt>{l(COPY.dpPdfStatus)}</dt>
              <dd>
                <StatusChip
                  status={pdfStatusChip(row.pdfImportStatus)}
                  label={l(PDF_STATUS_LABELS[row.pdfImportStatus])}
                />
              </dd>
            </div>
            {row.pdfFileName && (
              <div className="oc-detail-panel__field">
                <dt>{l(COPY.dpPdfFile)}</dt>
                <dd>{row.pdfFileName}</dd>
              </div>
            )}
            {row.pdfFileUrl && (
              <div className="oc-detail-panel__field">
                <dt>{l(COPY.dpPdfLink)}</dt>
                <dd>
                  <a href={row.pdfFileUrl} target="_blank" rel="noopener noreferrer">
                    {l(COPY.dpOpenPdf)}
                  </a>
                </dd>
              </div>
            )}
            {row.pdfReviewNotes && (
              <div className="oc-detail-panel__field">
                <dt>{l(COPY.dpPdfNotes)}</dt>
                <dd>{row.pdfReviewNotes}</dd>
              </div>
            )}
          </>
        )}
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
            {isLabParameterVisible('iron') && (
            <div className="oc-detail-panel__field">
              <dt>{l(COPY.dpIron)}</dt>
              <dd>{formatNum(row.ironPpm)}</dd>
            </div>
            )}
            {isLabParameterVisible('copper') && (
            <div className="oc-detail-panel__field">
              <dt>{l(COPY.dpCopper)}</dt>
              <dd>{formatNum(row.copperPpm)}</dd>
            </div>
            )}
            {isLabParameterVisible('silicon') && (
            <div className="oc-detail-panel__field">
              <dt>{l(COPY.dpSilicon)}</dt>
              <dd>{formatNum(row.siliconPpm)}</dd>
            </div>
            )}
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
        {row.approvalStatus && (
          <>
            <div className="oc-detail-panel__field">
              <dt>{l(COPY.dpApproval)}</dt>
              <dd>
                <StatusChip
                  status={approvalStatusChip(row.approvalStatus)}
                  label={l(APPROVAL_STATUS_LABELS[row.approvalStatus])}
                />
              </dd>
            </div>
            {row.approvedBy && (
              <div className="oc-detail-panel__field">
                <dt>{l(COPY.dpApprovedBy)}</dt>
                <dd>{row.approvedBy}</dd>
              </div>
            )}
            {row.approvedAt && (
              <div className="oc-detail-panel__field">
                <dt>{l(COPY.dpApprovedAt)}</dt>
                <dd>{formatDateTime(row.approvedAt)}</dd>
              </div>
            )}
            {isSampleApprovalLocked(row) && (
              <div className="oc-detail-panel__field">
                <dt>{l(COPY.dpLocked)}</dt>
                <dd><StatusChip status="critical" label={l(COPY.dpLocked)} /></dd>
              </div>
            )}
          </>
        )}
        <div className="oc-detail-panel__history">
          <h3 className="oc-detail-panel__history-title">{l(COPY.dpLpHistSec)}</h3>
          {row.lpMappingHistory.length === 0 ? (
            <p className="oc-detail-panel__history-empty">{l(COPY.dpLpHistEmpty)}</p>
          ) : (
            <ul className="oc-detail-panel__history-list">
              {[...row.lpMappingHistory].reverse().map((entry: OilSampleLpMappingHistoryEntry, idx) => (
                <li key={`${entry.at}-${idx}`} className="oc-detail-panel__history-item">
                  <span className="oc-detail-panel__history-action">
                    {entry.lubricationPointId} — {entry.fromStatus} → {entry.toStatus}
                  </span>
                  <span className="oc-detail-panel__history-meta">
                    {entry.actor} · {formatDateTime(entry.at)}
                  </span>
                  {entry.notes && (
                    <span className="oc-detail-panel__history-notes">{entry.notes}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="oc-detail-panel__history">
          <h3 className="oc-detail-panel__history-title">{l(COPY.dpHistSec)}</h3>
          {row.approvalHistory.length === 0 ? (
            <p className="oc-detail-panel__history-empty">{l(COPY.dpHistEmpty)}</p>
          ) : (
            <ul className="oc-detail-panel__history-list">
              {[...row.approvalHistory].reverse().map((entry, idx) => (
                <li key={`${entry.at}-${idx}`} className="oc-detail-panel__history-item">
                  <span className="oc-detail-panel__history-action">
                    {l(HISTORY_ACTION_LABELS[entry.action])}
                  </span>
                  <span className="oc-detail-panel__history-meta">
                    {entry.actor} · {formatDateTime(entry.at)}
                  </span>
                  {entry.notes && (
                    <span className="oc-detail-panel__history-notes">{entry.notes}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
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
            <option value="monitor">{l(COPY.condMonitor)}</option>
            <option value="caution">{l(COPY.condCaution)}</option>
            <option value="critical">{l(COPY.condCritical)}</option>
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
