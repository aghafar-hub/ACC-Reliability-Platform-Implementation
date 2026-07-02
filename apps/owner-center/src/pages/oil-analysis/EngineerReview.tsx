// apps/owner-center/src/pages/oil-analysis/EngineerReview.tsx
// Oil Analysis — Engineer Review & Approval (Sprint 06).

import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { StatusChip } from '../../components/StatusChip';
import type { ChipStatus } from '../../components/StatusChip';
import { SummaryCard } from '../../components/SummaryCard';
import {
  oilSampleService,
  computeSampleCondition,
  hasLabResults,
  isSampleApprovalLocked,
} from '../../modules/oil-analysis/sample.service';
import type {
  OilSampleRow,
  OilSampleApprovalStatus,
  OilSampleApprovalHistoryEntry,
  OilLabResultStatus,
  OilLabResultInput,
} from '../../modules/oil-analysis/sample.service';

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

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

function formatOptionalNumber(value: number | null): string {
  return value === null ? '' : String(value);
}

const COPY = {
  title:           { en: 'Engineer Review',              ar: 'مراجعة المهندس' },
  desc:            { en: 'Review analysed samples, edit before approval, and sign off laboratory results.', ar: 'مراجعة العينات المحللة وتعديلها قبل الموافقة والتصديق على نتائج المختبر.' },
  liveData:        { en: 'Approval workflow',            ar: 'سير الموافقة' },
  qPending:        { en: 'Pending Review',               ar: 'بانتظار المراجعة' },
  qReady:          { en: 'Ready for Approval',           ar: 'جاهزة للموافقة' },
  sumPending:      { en: 'Pending Review',               ar: 'بانتظار المراجعة' },
  sumReady:        { en: 'Ready for Approval',           ar: 'جاهزة للموافقة' },
  emptyPending:    { en: 'No samples awaiting review.',  ar: 'لا توجد عينات بانتظار المراجعة.' },
  emptyReady:      { en: 'No samples ready for approval. Open a pending sample to begin review.', ar: 'لا توجد عينات جاهزة للموافقة. افتح عينة معلقة لبدء المراجعة.' },
  selectSample:    { en: 'Select a sample to review.',   ar: 'اختر عينة للمراجعة.' },
  dpTitle:         { en: 'Review Detail',                ar: 'تفاصيل المراجعة' },
  dpClose:         { en: 'Close',                        ar: 'إغلاق' },
  dpSample:        { en: 'Sample ID',                    ar: 'معرّف العينة' },
  dpLab:           { en: 'Lab Sample ID',                ar: 'معرّف المختبر' },
  dpEquip:         { en: 'Equipment ID',                 ar: 'معرّف المعدة' },
  dpApproval:      { en: 'Approval Status',              ar: 'حالة الموافقة' },
  dpApprovedBy:    { en: 'Approved By',                  ar: 'وُوفق بواسطة' },
  dpApprovedAt:    { en: 'Approved At',                  ar: 'تاريخ الموافقة' },
  dpLocked:        { en: 'Laboratory values locked',     ar: 'قيم المختبر مقفلة' },
  btnOpen:         { en: 'Open Sample',                  ar: 'فتح العينة' },
  btnApprove:      { en: 'Approve',                      ar: 'موافقة' },
  btnReject:       { en: 'Reject',                       ar: 'رفض' },
  btnReturn:       { en: 'Return for Correction',        ar: 'إرجاع للتصحيح' },
  btnSaveEdit:     { en: 'Save Edits',                   ar: 'حفظ التعديلات' },
  secEdit:         { en: 'Edit Before Approval',         ar: 'تعديل قبل الموافقة' },
  secHistory:      { en: 'Approval History',             ar: 'سجل الموافقة' },
  histEmpty:       { en: 'No approval events recorded yet.', ar: 'لم يُسجَّل أي حدث موافقة بعد.' },
  rejTitle:        { en: 'Reject Sample',                ar: 'رفض العينة' },
  retTitle:        { en: 'Return for Correction',        ar: 'إرجاع للتصحيح' },
  reasonLabel:     { en: 'Reason *',                     ar: 'السبب *' },
  reasonPh:        { en: 'Enter reason…',                ar: 'أدخل السبب…' },
  reasonRequired:  { en: 'Reason is required.',          ar: 'السبب مطلوب.' },
  cancel:          { en: 'Cancel',                       ar: 'إلغاء' },
  confirm:         { en: 'Confirm',                      ar: 'تأكيد' },
  successOpen:     { en: 'Sample opened for review.',    ar: 'تم فتح العينة للمراجعة.' },
  successApprove:  { en: 'Sample approved and locked.',  ar: 'تمت الموافقة على العينة وقفلها.' },
  successReject:   { en: 'Sample rejected and returned to pending review.', ar: 'تم رفض العينة وإعادتها لقائمة المراجعة المعلقة.' },
  successReturn:   { en: 'Sample returned for correction.', ar: 'تم إرجاع العينة للتصحيح.' },
  successEdit:     { en: 'Edits saved.',                 ar: 'تم حفظ التعديلات.' },
  fldNotes:        { en: 'Notes',                        ar: 'ملاحظات' },
  fldLub:          { en: 'Lubricant',                    ar: 'زيت التشحيم' },
  fldLoc:          { en: 'Sampling Location',            ar: 'موقع أخذ العينة' },
  fldStatus:       { en: 'Result Status',                ar: 'حالة النتيجة' },
  stNormal:        { en: 'Normal',                       ar: 'طبيعي' },
  stMonitor:       { en: 'Monitor',                      ar: 'مراقبة' },
  stCaution:       { en: 'Caution',                      ar: 'تحذير' },
  stCritical:      { en: 'Critical',                     ar: 'حرج' },
  none:            { en: '—',                            ar: '—' },
} as const;

const APPROVAL_STATUS_LABELS: Record<OilSampleApprovalStatus, L10n<string>> = {
  pending:       { en: 'Pending',        ar: 'معلّق' },
  'under-review':{ en: 'Under Review',   ar: 'قيد المراجعة' },
  approved:      { en: 'Approved',       ar: 'موافق عليه' },
  locked:        { en: 'Locked',         ar: 'مقفل' },
};

const HISTORY_ACTION_LABELS: Record<OilSampleApprovalHistoryEntry['action'], L10n<string>> = {
  opened:                  { en: 'Opened for review',       ar: 'فُتحت للمراجعة' },
  edited:                  { en: 'Edited before approval',  ar: 'عُدِّلت قبل الموافقة' },
  approved:                { en: 'Approved',                ar: 'وُوفق عليها' },
  rejected:                { en: 'Rejected',                ar: 'رُفضت' },
  'returned-for-correction':{ en: 'Returned for correction', ar: 'أُعيدت للتصحيح' },
  locked:                  { en: 'Locked',                  ar: 'قُفلت' },
};

function approvalStatusChip(status: OilSampleApprovalStatus | null): ChipStatus {
  switch (status) {
    case 'locked':
    case 'approved': return 'operational';
    case 'under-review': return 'maintenance';
    case 'pending': return 'warning';
    default: return 'draft';
  }
}

interface ReviewFormState {
  notes: string;
  lubricant: string;
  samplingLocation: string;
  resultStatus: OilLabResultStatus | '';
  contaminationRating: string;
  equipmentRating: string;
  lubricantRating: string;
  ironPpm: string;
  copperPpm: string;
  siliconPpm: string;
  pqIndex: string;
  viscosity100c: string;
  tan: string;
  oxidation: string;
  waterPercent: string;
  particle4: string;
  particle6: string;
  particle14: string;
  sampleAnalysis: string;
  alertType: string;
}

function formFromSample(row: OilSampleRow): ReviewFormState {
  return {
    notes: row.notes,
    lubricant: row.lubricant,
    samplingLocation: row.samplingLocation,
    resultStatus: row.resultStatus ?? '',
    contaminationRating: row.contaminationRating,
    equipmentRating: row.equipmentRating,
    lubricantRating: row.lubricantRating,
    ironPpm: formatOptionalNumber(row.ironPpm),
    copperPpm: formatOptionalNumber(row.copperPpm),
    siliconPpm: formatOptionalNumber(row.siliconPpm),
    pqIndex: formatOptionalNumber(row.pqIndex),
    viscosity100c: formatOptionalNumber(row.viscosity100c),
    tan: formatOptionalNumber(row.tan),
    oxidation: formatOptionalNumber(row.oxidation),
    waterPercent: formatOptionalNumber(row.waterPercent),
    particle4: formatOptionalNumber(row.particle4),
    particle6: formatOptionalNumber(row.particle6),
    particle14: formatOptionalNumber(row.particle14),
    sampleAnalysis: row.sampleAnalysis,
    alertType: row.alertType,
  };
}

interface ReasonDialogProps {
  readonly title: L10n<string>;
  readonly locale: string;
  readonly onConfirm: (reason: string) => void;
  readonly onCancel: () => void;
}

function ReasonDialog({ title, locale, onConfirm, onCancel }: ReasonDialogProps): React.ReactElement {
  const l = (b: L10n<string>) => t(b, locale);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  function handleConfirm(): void {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(l(COPY.reasonRequired));
      return;
    }
    onConfirm(trimmed);
  }

  return (
    <div className="oc-reject-dialog" role="dialog" aria-modal="true" aria-label={l(title)}>
      <div className="oc-reject-dialog__body">
        <h3 className="oc-reject-dialog__title">{l(title)}</h3>
        <div className="ur-form-field">
          <label className="ur-form-label">{l(COPY.reasonLabel)}</label>
          <textarea
            className={`ur-form-input oc-textarea ${error ? 'ur-form-input--error' : ''}`}
            rows={3}
            value={reason}
            onChange={(e) => { setReason(e.target.value); if (e.target.value) setError(''); }}
            placeholder={l(COPY.reasonPh)}
            autoFocus
          />
          {error && <p className="ur-form-error">{error}</p>}
        </div>
        <div className="oc-reject-dialog__footer">
          <button type="button" className="ur-btn ur-btn--ghost ur-btn--sm" onClick={onCancel}>
            {l(COPY.cancel)}
          </button>
          <button type="button" className="ur-btn ur-btn--sm oc-reject-dialog__confirm-btn" onClick={handleConfirm}>
            {l(COPY.confirm)}
          </button>
        </div>
      </div>
    </div>
  );
}

interface QueueListProps {
  readonly rows: readonly OilSampleRow[];
  readonly selectedId: string | null;
  readonly locale: string;
  readonly emptyMessage: L10n<string>;
  readonly onSelect: (id: string) => void;
}

function QueueList({ rows, selectedId, locale, emptyMessage, onSelect }: QueueListProps): React.ReactElement {
  const l = (b: L10n<string>) => t(b, locale);

  if (rows.length === 0) {
    return <p className="db-panel__empty">{l(emptyMessage)}</p>;
  }

  return (
    <ul className="ol-db-list">
      {rows.map((row) => {
        const cond = computeSampleCondition(row);
        const isSelected = row.id === selectedId;
        return (
          <li key={row.id}>
            <button
              type="button"
              className={`ol-db-list__item ol-db-list__item--button ${isSelected ? 'ol-db-list__item--selected' : ''}`}
              onClick={() => onSelect(row.id)}
            >
              <span className="ol-db-list__badge">{row.sampleId}</span>
              <span className="ol-db-list__name">{row.equipmentId}</span>
              <span className="ol-db-list__meta">
                {row.labSampleId} · {formatDate(row.sampledAt)} · {cond}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface ReviewDetailPanelProps {
  readonly row: OilSampleRow;
  readonly locale: string;
  readonly reviewerName: string;
  readonly onClose: () => void;
  readonly onUpdated: () => void;
}

function ReviewDetailPanel({
  row,
  locale,
  reviewerName,
  onClose,
  onUpdated,
}: ReviewDetailPanelProps): React.ReactElement {
  const l = (b: L10n<string>) => t(b, locale);
  const [form, setForm] = useState<ReviewFormState>(() => formFromSample(row));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'reject' | 'return' | null>(null);

  const approvalStatus = row.approvalStatus;
  const locked = isSampleApprovalLocked(row);
  const canOpen = approvalStatus === 'pending' && hasLabResults(row);
  const canEdit = approvalStatus === 'under-review' && !locked;
  const canDecide = approvalStatus === 'under-review' && !locked;

  function handleOpen(): void {
    try {
      oilSampleService.openSampleForReview(row.id, reviewerName);
      setSuccess(l(COPY.successOpen));
      setError(null);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Open failed.');
      setSuccess(null);
    }
  }

  function handleSaveEdit(): void {
    if (!form.resultStatus) {
      setError('Result status is required.');
      return;
    }
    const labResults: OilLabResultInput = {
      resultStatus: form.resultStatus,
      contaminationRating: form.contaminationRating,
      equipmentRating: form.equipmentRating,
      lubricantRating: form.lubricantRating,
      ironPpm: parseOptionalNumber(form.ironPpm),
      copperPpm: parseOptionalNumber(form.copperPpm),
      siliconPpm: parseOptionalNumber(form.siliconPpm),
      pqIndex: parseOptionalNumber(form.pqIndex),
      viscosity100c: parseOptionalNumber(form.viscosity100c),
      tan: parseOptionalNumber(form.tan),
      oxidation: parseOptionalNumber(form.oxidation),
      waterPercent: parseOptionalNumber(form.waterPercent),
      particle4: parseOptionalNumber(form.particle4),
      particle6: parseOptionalNumber(form.particle6),
      particle14: parseOptionalNumber(form.particle14),
      sampleAnalysis: form.sampleAnalysis,
      alertType: form.alertType,
    };
    try {
      oilSampleService.editBeforeApproval(row.id, reviewerName, {
        notes: form.notes,
        lubricant: form.lubricant,
        samplingLocation: form.samplingLocation,
        labResults,
      });
      setSuccess(l(COPY.successEdit));
      setError(null);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
      setSuccess(null);
    }
  }

  function handleApprove(): void {
    try {
      oilSampleService.approveSample(row.id, reviewerName);
      setSuccess(l(COPY.successApprove));
      setError(null);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed.');
      setSuccess(null);
    }
  }

  function handleReject(reason: string): void {
    try {
      oilSampleService.rejectSample(row.id, reason, reviewerName);
      setSuccess(l(COPY.successReject));
      setError(null);
      setDialog(null);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed.');
      setSuccess(null);
    }
  }

  function handleReturn(reason: string): void {
    try {
      oilSampleService.returnForCorrection(row.id, reason, reviewerName);
      setSuccess(l(COPY.successReturn));
      setError(null);
      setDialog(null);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Return failed.');
      setSuccess(null);
    }
  }

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
        {approvalStatus && (
          <StatusChip
            status={approvalStatusChip(approvalStatus)}
            label={l(APPROVAL_STATUS_LABELS[approvalStatus])}
          />
        )}
        {locked && (
          <StatusChip status="critical" label={l(COPY.dpLocked)} />
        )}
      </div>

      {error && <p className="ur-form-error">{error}</p>}
      {success && (
        <p className="db-panel__empty" role="status" style={{ color: 'var(--chip-operational-text)' }}>
          {success}
        </p>
      )}

      <dl className="oc-detail-panel__fields">
        <div className="oc-detail-panel__field">
          <dt>{l(COPY.dpSample)}</dt>
          <dd>{row.sampleId}</dd>
        </div>
        <div className="oc-detail-panel__field">
          <dt>{l(COPY.dpLab)}</dt>
          <dd>{row.labSampleId}</dd>
        </div>
        <div className="oc-detail-panel__field">
          <dt>{l(COPY.dpEquip)}</dt>
          <dd className="oc-detail-panel__equip-id">{row.equipmentId}</dd>
        </div>
        <div className="oc-detail-panel__field">
          <dt>{l(COPY.dpApproval)}</dt>
          <dd>
            {approvalStatus
              ? <StatusChip status={approvalStatusChip(approvalStatus)} label={l(APPROVAL_STATUS_LABELS[approvalStatus])} />
              : l(COPY.none)}
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
      </dl>

      {canOpen && (
        <div className="oc-detail-panel__actions">
          <button type="button" className="ur-btn ur-btn--primary" onClick={handleOpen}>
            {l(COPY.btnOpen)}
          </button>
        </div>
      )}

      {canEdit && (
        <div className="db-panel">
          <div className="db-panel__head">
            <span className="db-panel__title">{l(COPY.secEdit)}</span>
          </div>
          <div className="db-panel__body">
            <div className="ur-form-field">
              <label className="ur-form-label">{l(COPY.fldNotes)}</label>
              <textarea
                className="ur-form-input oc-textarea"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <div className="ur-form-field">
              <label className="ur-form-label">{l(COPY.fldLub)}</label>
              <input
                className="ur-form-input"
                value={form.lubricant}
                onChange={(e) => setForm((prev) => ({ ...prev, lubricant: e.target.value }))}
              />
            </div>
            <div className="ur-form-field">
              <label className="ur-form-label">{l(COPY.fldLoc)}</label>
              <input
                className="ur-form-input"
                value={form.samplingLocation}
                onChange={(e) => setForm((prev) => ({ ...prev, samplingLocation: e.target.value }))}
              />
            </div>
            <div className="ur-form-field">
              <label className="ur-form-label">{l(COPY.fldStatus)}</label>
              <select
                className="ur-form-input"
                value={form.resultStatus}
                onChange={(e) => setForm((prev) => ({ ...prev, resultStatus: e.target.value as OilLabResultStatus | '' }))}
              >
                <option value="">{l(COPY.none)}</option>
                <option value="normal">{l(COPY.stNormal)}</option>
                <option value="monitor">{l(COPY.stMonitor)}</option>
                <option value="caution">{l(COPY.stCaution)}</option>
                <option value="critical">{l(COPY.stCritical)}</option>
              </select>
            </div>
            <button type="button" className="ur-btn ur-btn--primary" onClick={handleSaveEdit}>
              {l(COPY.btnSaveEdit)}
            </button>
          </div>
        </div>
      )}

      {canDecide && !dialog && (
        <div className="oc-approval-actions">
          <div className="oc-approval-actions__btns">
            <button
              type="button"
              className="ur-btn ur-btn--sm oc-approval-actions__approve-btn"
              onClick={handleApprove}
            >
              {l(COPY.btnApprove)}
            </button>
            <button
              type="button"
              className="ur-btn ur-btn--ghost ur-btn--sm oc-approval-actions__reject-btn"
              onClick={() => setDialog('reject')}
            >
              {l(COPY.btnReject)}
            </button>
            <button
              type="button"
              className="ur-btn ur-btn--ghost ur-btn--sm"
              onClick={() => setDialog('return')}
            >
              {l(COPY.btnReturn)}
            </button>
          </div>
        </div>
      )}

      {dialog === 'reject' && (
        <ReasonDialog
          title={COPY.rejTitle}
          locale={locale}
          onConfirm={handleReject}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'return' && (
        <ReasonDialog
          title={COPY.retTitle}
          locale={locale}
          onConfirm={handleReturn}
          onCancel={() => setDialog(null)}
        />
      )}

      <div className="oc-detail-panel__history">
        <h3 className="oc-detail-panel__history-title">{l(COPY.secHistory)}</h3>
        {row.approvalHistory.length === 0 ? (
          <p className="oc-detail-panel__history-empty">{l(COPY.histEmpty)}</p>
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
    </aside>
  );
}

export default function EngineerReview(): React.ReactElement {
  const { locale } = useLanguage();
  const { user } = useAuth();
  const l = (b: L10n<string>) => t(b, locale);

  const reviewerName = user?.displayName ?? user?.email ?? 'Unknown Reviewer';

  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pendingQueue = useMemo(
    () => oilSampleService.listPendingReviewQueue(),
    [revision],
  );
  const readyQueue = useMemo(
    () => oilSampleService.listReadyForApprovalQueue(),
    [revision],
  );

  const selected = selectedId ? oilSampleService.findById(selectedId) : null;
  const hasDetail = selected !== null;

  function handleUpdated(): void {
    setRevision((n) => n + 1);
    if (selectedId) {
      const refreshed = oilSampleService.findById(selectedId);
      if (!refreshed) setSelectedId(null);
    }
  }

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
        <SummaryCard value={String(pendingQueue.length)} label={l(COPY.sumPending)} modifier="caution" />
        <SummaryCard value={String(readyQueue.length)} label={l(COPY.sumReady)} modifier="warning" />
      </div>

      <div className={`oc-workspace ${hasDetail ? 'oc-workspace--split' : ''}`}>
        <div className="oc-workspace__list">
          <div className="db-two-col">
            <div className="db-panel">
              <div className="db-panel__head">
                <span className="db-panel__title">{l(COPY.qPending)}</span>
                {pendingQueue.length > 0 && (
                  <span className="ol-db-badge ol-db-badge--warning">{pendingQueue.length}</span>
                )}
              </div>
              <div className="db-panel__body">
                <QueueList
                  rows={pendingQueue}
                  selectedId={selectedId}
                  locale={locale}
                  emptyMessage={COPY.emptyPending}
                  onSelect={setSelectedId}
                />
              </div>
            </div>
            <div className="db-panel">
              <div className="db-panel__head">
                <span className="db-panel__title">{l(COPY.qReady)}</span>
                {readyQueue.length > 0 && (
                  <span className="ol-db-badge ol-db-badge--warning">{readyQueue.length}</span>
                )}
              </div>
              <div className="db-panel__body">
                <QueueList
                  rows={readyQueue}
                  selectedId={selectedId}
                  locale={locale}
                  emptyMessage={COPY.emptyReady}
                  onSelect={setSelectedId}
                />
              </div>
            </div>
          </div>
          {!hasDetail && (pendingQueue.length > 0 || readyQueue.length > 0) && (
            <p className="oc-workspace__hint">{l(COPY.selectSample)}</p>
          )}
        </div>

        {hasDetail && selected && (
          <ReviewDetailPanel
            key={`${selected.id}-${selected.updatedAt}`}
            row={selected}
            locale={locale}
            reviewerName={reviewerName}
            onClose={() => setSelectedId(null)}
            onUpdated={handleUpdated}
          />
        )}
      </div>
    </div>
  );
}
