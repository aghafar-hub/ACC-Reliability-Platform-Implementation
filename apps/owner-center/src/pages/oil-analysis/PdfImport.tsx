// apps/owner-center/src/pages/oil-analysis/PdfImport.tsx
// Oil Analysis — PDF Import shell + import review (Sprint 04).

import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { StatusChip } from '../../components/StatusChip';
import type { ChipStatus } from '../../components/StatusChip';
import { oilSampleService } from '../../modules/oil-analysis/sample.service';
import type { OilSampleRow, PdfImportStatus } from '../../modules/oil-analysis/sample.service';

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

const COPY = {
  title:        { en: 'PDF Import',                    ar: 'استيراد PDF' },
  desc:         { en: 'Attach lab report PDF metadata to an existing sample and review the import.', ar: 'إرفاق بيانات تقرير المختبر PDF بعينة موجودة ومراجعة الاستيراد.' },
  liveData:     { en: 'Metadata only',                 ar: 'بيانات وصفية فقط' },
  secSelect:    { en: 'Select Sample',                 ar: 'اختر العينة' },
  secUpload:    { en: 'Attach PDF',                    ar: 'إرفاق PDF' },
  secReview:    { en: 'Import Review',                 ar: 'مراجعة الاستيراد' },
  secSummary:   { en: 'Sample Summary',                ar: 'ملخص العينة' },
  secPdfMeta:   { en: 'PDF Metadata',                  ar: 'بيانات PDF' },
  selPh:        { en: 'Choose a sample…',              ar: 'اختر عينة…' },
  noSamples:    { en: 'No samples available. Register a sample via Intake first.', ar: 'لا توجد عينات. سجّل عينة عبر الاستقبال أولاً.' },
  fldFile:      { en: 'PDF File (optional)',           ar: 'ملف PDF (اختياري)' },
  fldUrl:       { en: 'PDF Link *',                    ar: 'رابط PDF *' },
  urlPh:        { en: 'https://…',                     ar: 'https://…' },
  btnAttach:    { en: 'Attach PDF',                    ar: 'إرفاق PDF' },
  btnReset:     { en: 'Reset',                         ar: 'إعادة تعيين' },
  attachOk:     { en: 'PDF metadata saved. Sample marked pending review.', ar: 'تم حفظ بيانات PDF. العينة بانتظار المراجعة.' },
  btnOpenPdf:   { en: 'Open PDF Link',                 ar: 'فتح رابط PDF' },
  fldNotes:     { en: 'Review Notes',                  ar: 'ملاحظات المراجعة' },
  fldReject:    { en: 'Reject Reason *',               ar: 'سبب الرفض *' },
  btnReviewed:  { en: 'Mark Reviewed',                 ar: 'وضع علامة مراجَعة' },
  btnReject:    { en: 'Reject PDF',                    ar: 'رفض PDF' },
  reviewOk:     { en: 'PDF import marked as reviewed.', ar: 'تم وضع علامة مراجَعة على استيراد PDF.' },
  rejectOk:     { en: 'PDF import rejected.',          ar: 'تم رفض استيراد PDF.' },
  sumSample:    { en: 'Sample ID',                     ar: 'معرّف العينة' },
  sumLab:       { en: 'Lab Sample ID',                 ar: 'معرّف المختبر' },
  sumEquip:     { en: 'Equipment ID',                  ar: 'معرّف المعدة' },
  sumLp:        { en: 'LP ID',                         ar: 'رمز النقطة' },
  sumDate:      { en: 'Sample Date',                   ar: 'تاريخ العينة' },
  sumStatus:    { en: 'Sample Status',                 ar: 'حالة العينة' },
  metaFile:     { en: 'File Name',                     ar: 'اسم الملف' },
  metaUrl:      { en: 'PDF URL',                       ar: 'رابط PDF' },
  metaUploaded: { en: 'Uploaded At',                   ar: 'تاريخ الرفع' },
  metaStatus:   { en: 'Import Status',                 ar: 'حالة الاستيراد' },
  metaNotes:    { en: 'Review Notes',                  ar: 'ملاحظات المراجعة' },
  none:         { en: '—',                             ar: '—' },
  pendingHint:  { en: 'This sample has a PDF pending review.', ar: 'هذه العينة لديها PDF بانتظار المراجعة.' },
  reviewedHint: { en: 'This PDF import has been reviewed.', ar: 'تمت مراجعة استيراد PDF هذا.' },
  rejectedHint: { en: 'This PDF import was rejected.', ar: 'تم رفض استيراد PDF هذا.' },
} as const;

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

export default function PdfImport(): React.ReactElement {
  const { locale } = useLanguage();
  const l = (b: L10n<string>) => t(b, locale);

  const samples = oilSampleService.list();
  const [selectedId, setSelectedId] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const selected = useMemo(
    () => (selectedId ? oilSampleService.findById(selectedId) : null),
    [selectedId, revision],
  );

  const showUploadForm = selected !== null && selected.pdfImportStatus !== 'pending-review';
  const showReviewPanel = selected !== null && selected.pdfImportStatus !== 'none';
  const canReview = selected?.pdfImportStatus === 'pending-review';

  function handleSelectSample(id: string): void {
    setSelectedId(id);
    setPdfUrl('');
    setPdfFileName(null);
    setReviewNotes('');
    setRejectReason('');
    setError(null);
    setSuccess(null);
    const row = id ? oilSampleService.findById(id) : null;
    if (row) {
      setPdfUrl(row.pdfFileUrl ?? '');
      setPdfFileName(row.pdfFileName);
      setReviewNotes(row.pdfReviewNotes);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    setPdfFileName(file?.name ?? null);
    setError(null);
    setSuccess(null);
  }

  function handleAttach(e: React.FormEvent): void {
    e.preventDefault();
    if (!selectedId) {
      setError('Sample is required.');
      return;
    }

    try {
      oilSampleService.attachPdfImport(selectedId, {
        pdfFileName,
        pdfFileUrl: pdfUrl,
      });
      setSuccess(l(COPY.attachOk));
      setRevision((n) => n + 1);
      setRejectReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Attach failed.');
      setSuccess(null);
    }
  }

  function handleMarkReviewed(): void {
    if (!selectedId) {
      setError('Sample is required.');
      return;
    }

    try {
      oilSampleService.reviewPdfImport(selectedId, reviewNotes);
      setSuccess(l(COPY.reviewOk));
      setRevision((n) => n + 1);
      setRejectReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed.');
      setSuccess(null);
    }
  }

  function handleReject(): void {
    if (!selectedId) {
      setError('Sample is required.');
      return;
    }

    try {
      oilSampleService.rejectPdfImport(selectedId, rejectReason);
      setSuccess(l(COPY.rejectOk));
      setRevision((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed.');
      setSuccess(null);
    }
  }

  return (
    <div className="ur-page">
      <div className="ur-page__header">
        <div className="ur-page__header-text">
          <h1 className="ur-page__title">{l(COPY.title)}</h1>
          <p className="ur-page__desc">{l(COPY.desc)}</p>
        </div>
        <StatusChip status="operational" label={l(COPY.liveData)} className="ur-page__sdk-badge" />
      </div>

      <div className="db-panel">
        <div className="db-panel__head">
          <span className="db-panel__title">{l(COPY.secSelect)}</span>
        </div>
        <div className="db-panel__body">
          {samples.length === 0 ? (
            <p className="db-panel__empty">{l(COPY.noSamples)}</p>
          ) : (
            <select
              className="ur-form-input"
              value={selectedId}
              onChange={(e) => handleSelectSample(e.target.value)}
              aria-label={l(COPY.secSelect)}
            >
              <option value="">{l(COPY.selPh)}</option>
              {samples.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sampleId} · {s.equipmentId} · {s.labSampleId}
                  {s.pdfImportStatus !== 'none' ? ` · PDF: ${s.pdfImportStatus}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && <p className="ur-form-error" role="alert">{error}</p>}
      {success && (
        <p className="db-panel__empty" role="status" style={{ color: 'var(--chip-operational-text)' }}>
          {success}
        </p>
      )}

      {selected && showUploadForm && (
        <div className="db-panel">
          <div className="db-panel__head">
            <span className="db-panel__title">{l(COPY.secUpload)}</span>
          </div>
          <div className="db-panel__body">
            <form onSubmit={handleAttach}>
              <div className="ol-form-grid">
                <div className="ur-form-field">
                  <label className="ur-form-label" htmlFor="pi-file">{l(COPY.fldFile)}</label>
                  <input
                    id="pi-file"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="ur-form-input"
                    onChange={handleFileChange}
                  />
                  {pdfFileName && (
                    <span className="ur-form-hint">{pdfFileName}</span>
                  )}
                </div>
                <div className="ur-form-field">
                  <label className="ur-form-label" htmlFor="pi-url">{l(COPY.fldUrl)}</label>
                  <input
                    id="pi-url"
                    type="url"
                    className="ur-form-input"
                    placeholder={l(COPY.urlPh)}
                    value={pdfUrl}
                    onChange={(e) => { setPdfUrl(e.target.value); setError(null); setSuccess(null); }}
                    required
                  />
                </div>
              </div>
              <div className="ur-dialog__footer">
                <button type="submit" className="ur-btn ur-btn--primary">{l(COPY.btnAttach)}</button>
                <button
                  type="button"
                  className="ur-btn ur-btn--ghost"
                  onClick={() => { setPdfUrl(''); setPdfFileName(null); setError(null); setSuccess(null); }}
                >
                  {l(COPY.btnReset)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selected && showReviewPanel && (
        <div className="db-panel">
          <div className="db-panel__head">
            <span className="db-panel__title">{l(COPY.secReview)}</span>
            <StatusChip
              status={pdfStatusChip(selected.pdfImportStatus)}
              label={l(PDF_STATUS_LABELS[selected.pdfImportStatus])}
            />
          </div>
          <div className="db-panel__body">
            {canReview && (
              <p className="ur-form-hint">{l(COPY.pendingHint)}</p>
            )}
            {selected.pdfImportStatus === 'reviewed' && (
              <p className="ur-form-hint">{l(COPY.reviewedHint)}</p>
            )}
            {selected.pdfImportStatus === 'rejected' && (
              <p className="ur-form-hint">{l(COPY.rejectedHint)}</p>
            )}

            <h3 className="db-panel__title">{l(COPY.secSummary)}</h3>
            <dl className="oc-detail-panel__fields">
              <div className="oc-detail-panel__field">
                <dt>{l(COPY.sumSample)}</dt>
                <dd>{selected.sampleId}</dd>
              </div>
              <div className="oc-detail-panel__field">
                <dt>{l(COPY.sumLab)}</dt>
                <dd>{selected.labSampleId}</dd>
              </div>
              <div className="oc-detail-panel__field">
                <dt>{l(COPY.sumEquip)}</dt>
                <dd>{selected.equipmentId}</dd>
              </div>
              <div className="oc-detail-panel__field">
                <dt>{l(COPY.sumLp)}</dt>
                <dd>{selected.lubricationPointId ?? l(COPY.none)}</dd>
              </div>
              <div className="oc-detail-panel__field">
                <dt>{l(COPY.sumDate)}</dt>
                <dd>{formatDate(selected.sampledAt)}</dd>
              </div>
              <div className="oc-detail-panel__field">
                <dt>{l(COPY.sumStatus)}</dt>
                <dd>{selected.status}</dd>
              </div>
            </dl>

            <h3 className="db-panel__title">{l(COPY.secPdfMeta)}</h3>
            <dl className="oc-detail-panel__fields">
              <div className="oc-detail-panel__field">
                <dt>{l(COPY.metaFile)}</dt>
                <dd>{selected.pdfFileName ?? l(COPY.none)}</dd>
              </div>
              <div className="oc-detail-panel__field">
                <dt>{l(COPY.metaUrl)}</dt>
                <dd>{selected.pdfFileUrl ?? l(COPY.none)}</dd>
              </div>
              <div className="oc-detail-panel__field">
                <dt>{l(COPY.metaUploaded)}</dt>
                <dd>{selected.pdfUploadedAt ? formatDate(selected.pdfUploadedAt) : l(COPY.none)}</dd>
              </div>
              <div className="oc-detail-panel__field">
                <dt>{l(COPY.metaStatus)}</dt>
                <dd>
                  <StatusChip
                    status={pdfStatusChip(selected.pdfImportStatus)}
                    label={l(PDF_STATUS_LABELS[selected.pdfImportStatus])}
                  />
                </dd>
              </div>
              {selected.pdfReviewNotes && (
                <div className="oc-detail-panel__field">
                  <dt>{l(COPY.metaNotes)}</dt>
                  <dd>{selected.pdfReviewNotes}</dd>
                </div>
              )}
            </dl>

            {selected.pdfFileUrl && (
              <div className="ur-dialog__footer">
                <a
                  href={selected.pdfFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ur-btn ur-btn--primary"
                >
                  {l(COPY.btnOpenPdf)}
                </a>
              </div>
            )}

            {canReview && (
              <>
                <div className="ur-form-field">
                  <label className="ur-form-label" htmlFor="pi-notes">{l(COPY.fldNotes)}</label>
                  <textarea
                    id="pi-notes"
                    className="ur-form-input"
                    rows={3}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />
                </div>

                <div className="ur-form-field">
                  <label className="ur-form-label" htmlFor="pi-reject">{l(COPY.fldReject)}</label>
                  <textarea
                    id="pi-reject"
                    className="ur-form-input"
                    rows={2}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>

                <div className="ur-dialog__footer">
                  <button type="button" className="ur-btn ur-btn--primary" onClick={handleMarkReviewed}>
                    {l(COPY.btnReviewed)}
                  </button>
                  <button type="button" className="ur-btn ur-btn--ghost" onClick={handleReject}>
                    {l(COPY.btnReject)}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
