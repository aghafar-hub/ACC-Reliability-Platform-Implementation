// apps/owner-center/src/pages/oil-analysis/AddSample.tsx
// OA-004 Add Sample / PDF Import — batch upload, engineer review, smart LP mapping.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { usePlatformSdk } from '../../context/SdkContext';
import {
  CardList,
  DataTable,
  Dialog,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  ReviewQueue,
  SectionCard,
  StatusBadge,
  UploadDropZone,
  useIsMobile,
} from '../../components/ui';
import type {
  DataTableColumn,
  StatusBadgeVariant,
  UploadFileState,
} from '../../components/ui';
import { OilAnalysisActionButton } from '../../components/oil-analysis/OilAnalysisActionButton';
import { useOilAnalysisPermissions } from '../../hooks/useOilAnalysisPermissions';
import { addSampleService } from '../../modules/oil-analysis/add-sample.service';
import type { AddSampleDraft, DuplicateResolution } from '../../modules/oil-analysis/add-sample.types';
import { resolveOilAnalysisContractorScope } from '../../modules/oil-analysis/contractor-scope';
import { oilSampleService } from '../../modules/oil-analysis/sample.service';
import {
  isManualEntryEnabled,
  isPdfImportEnabled,
  SETTINGS_GUARD_COPY,
} from '../../modules/oil-analysis/settings-guards';
import EquipmentPicker from './EquipmentPicker';
import { SettingsDisabledPanel } from './SettingsDisabledPanel';

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

type WorkflowPhase = 'upload' | 'review' | 'complete';

const COPY = {
  title: { en: 'Add Sample', ar: 'إضافة عينة' },
  subtitle: {
    en: 'Import lab reports via PDF or manual backup entry. Samples are saved only after engineer review.',
    ar: 'استيراد تقارير المختبر عبر PDF أو إدخال يدوي احتياطي. لا تُحفظ العينات إلا بعد مراجعة المهندس.',
  },
  badge: { en: 'Review required', ar: 'مراجعة مطلوبة' },
  secUpload: { en: 'Upload PDF Reports', ar: 'رفع تقارير PDF' },
  uploadLabel: { en: 'Drop PDF files or click to browse', ar: 'أسقط ملفات PDF أو انقر للتصفح' },
  uploadHint: {
    en: 'Batch or single PDF. Mobil reports: only the latest sample column is imported.',
    ar: 'رفع دفعة أو ملف واحد. تقارير موبيل: يُستورد عمود أحدث عينة فقط.',
  },
  btnProcess: { en: 'Process PDFs', ar: 'معالجة ملفات PDF' },
  secManual: { en: 'Manual Entry (Backup)', ar: 'إدخال يدوي (احتياطي)' },
  fldLab: { en: 'Sample ID / Lab Report ID *', ar: 'معرّف العينة / تقرير المختبر *' },
  fldDate: { en: 'Sample Date *', ar: 'تاريخ العينة *' },
  fldLub: { en: 'Oil / Lubricant', ar: 'الزيت / المشحّم' },
  fldLp: { en: 'LP_ID', ar: 'LP_ID' },
  fldLpSuggest: { en: 'Suggested from prior mapping', ar: 'مقترح من الربط السابق' },
  fldNotes: { en: 'Notes', ar: 'ملاحظات' },
  btnManual: { en: 'Add to Review Queue', ar: 'إضافة لقائمة المراجعة' },
  secPdf: { en: 'Original PDF', ar: 'PDF الأصلي' },
  pdfPlaceholder: { en: 'PDF preview placeholder — open original file when Drive URL is available.', ar: 'معاينة PDF مؤقتة — افتح الملف الأصلي عند توفر رابط Drive.' },
  pdfFile: { en: 'File name', ar: 'اسم الملف' },
  pdfStatus: { en: 'Upload status', ar: 'حالة الرفع' },
  pdfDriveId: { en: 'Drive File ID', ar: 'معرّف ملف Drive' },
  btnOpenPdf: { en: 'Open original PDF', ar: 'فتح PDF الأصلي' },
  secExtracted: { en: 'Extracted Laboratory Values', ar: 'قيم المختبر المستخرجة' },
  secMeta: { en: 'Sample Details', ar: 'تفاصيل العينة' },
  fldEquip: { en: 'Equipment_ID', ar: 'Equipment_ID' },
  fldSampleId: { en: 'Sample ID', ar: 'معرّف العينة' },
  fldReportStatus: { en: 'Report Status', ar: 'حالة التقرير' },
  fldContam: { en: 'Contamination Rating', ar: 'تقييم التلوث' },
  fldEquipRating: { en: 'Equipment Rating', ar: 'تقييم المعدة' },
  fldLubRating: { en: 'Lubricant Rating', ar: 'تقييم الزيت' },
  fldOcr: { en: 'OCR confidence', ar: 'ثقة OCR' },
  fldCellColors: { en: 'Cell color status', ar: 'حالة ألوان الخلايا' },
  mobilNote: {
    en: '{n} older Mobil trend column(s) ignored — display-only on Sample Report.',
    ar: 'تم تجاهل {n} عمود اتجاه موبيل أقدم — للعرض فقط في تقرير العينة.',
  },
  dupTitle: { en: 'Duplicate Report Detected', ar: 'تقرير مكرر' },
  dupMsg: {
    en: 'This Sample ID already exists in the registry. Choose how to proceed.',
    ar: 'معرّف العينة موجود مسبقاً في السجل. اختر كيفية المتابعة.',
  },
  dupSkip: { en: 'Skip', ar: 'تخطي' },
  dupOverwrite: { en: 'Overwrite / Save corrected version', ar: 'استبدال / حفظ نسخة مصححة' },
  dupManual: { en: 'Review manually', ar: 'مراجعة يدوية' },
  overwriteReason: { en: 'Overwrite reason *', ar: 'سبب الاستبدال *' },
  btnSaveContinue: { en: 'Save & Continue', ar: 'حفظ ومتابعة' },
  btnReject: { en: 'Reject This Sample', ar: 'رفض هذه العينة' },
  btnFinish: { en: 'Finish Batch', ar: 'إنهاء الدفعة' },
  btnNewBatch: { en: 'Start New Batch', ar: 'بدء دفعة جديدة' },
  completeTitle: { en: 'Batch review complete', ar: 'اكتملت مراجعة الدفعة' },
  completeDesc: {
    en: 'All items in this batch have been saved, skipped, or rejected.',
    ar: 'تم حفظ أو تخطي أو رفض جميع عناصر هذه الدفعة.',
  },
  emptyQueue: { en: 'No samples in review queue.', ar: 'لا توجد عينات في قائمة المراجعة.' },
  processing: { en: 'Processing PDFs…', ar: 'جاري معالجة ملفات PDF…' },
  actionCreated: { en: 'Draft engineering action created.', ar: 'تم إنشاء إجراء هندسي مسودة.' },
  none: { en: '—', ar: '—' },
  colParam: { en: 'Parameter', ar: 'المعامل' },
  colValue: { en: 'Value', ar: 'القيمة' },
  colColor: { en: 'Cell color', ar: 'لون الخلية' },
} as const;

function cellColorVariant(color: string): StatusBadgeVariant {
  if (color === 'alert') return 'alert';
  if (color === 'caution') return 'caution';
  if (color === 'normal') return 'normal';
  return 'disabled';
}

function reportStatusVariant(status: string): StatusBadgeVariant {
  if (status === 'alert') return 'alert';
  if (status === 'caution') return 'caution';
  return 'normal';
}

function uploadFileId(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export default function AddSample(): React.ReactElement {
  const pdfEnabled = isPdfImportEnabled();
  const manualEnabled = isManualEntryEnabled();

  if (!pdfEnabled && !manualEnabled) {
    return (
      <SettingsDisabledPanel
        title={COPY.title}
        desc={COPY.subtitle}
        message={SETTINGS_GUARD_COPY.pdfImportDisabled}
        badge={{ en: 'Disabled', ar: 'معطّل' }}
      />
    );
  }

  return <AddSampleContent pdfEnabled={pdfEnabled} manualEnabled={manualEnabled} />;
}

interface AddSampleContentProps {
  readonly pdfEnabled: boolean;
  readonly manualEnabled: boolean;
}

function AddSampleContent({ pdfEnabled, manualEnabled }: AddSampleContentProps): React.ReactElement {
  const { locale } = useLanguage();
  const { user } = useAuth();
  const sdk = usePlatformSdk();
  const permissions = useOilAnalysisPermissions();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const l = (b: L10n<string>) => t(b, locale);

  const scope = useMemo(() => resolveOilAnalysisContractorScope(sdk), [sdk]);
  const actor = user?.displayName ?? user?.email ?? 'Engineer';

  const [phase, setPhase] = useState<WorkflowPhase>(() => {
    const pending = addSampleService.getPendingQueue();
    return pending.length > 0 ? 'review' : 'upload';
  });
  const [revision, setRevision] = useState(0);
  const [uploadFiles, setUploadFiles] = useState<UploadFileState[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dupDialog, setDupDialog] = useState<AddSampleDraft | null>(null);
  const [overwriteReason, setOverwriteReason] = useState('');

  const [manualForm, setManualForm] = useState({
    equipmentId: searchParams.get('equipment') ?? '',
    labSampleId: '',
    sampledAt: '',
    lubricant: '',
    lubricationPointId: searchParams.get('lp') ?? '',
    notes: '',
  });

  const pendingQueue = useMemo(
    () => addSampleService.getPendingQueue(),
    [revision],
  );
  const counters = useMemo(() => addSampleService.computeCounters(), [revision]);
  const currentDraft = pendingQueue[currentIndex] ?? null;

  const bump = useCallback(() => setRevision((n) => n + 1), []);

  useEffect(() => {
    if (searchParams.get('mode') === 'manual' && manualEnabled) {
      document.getElementById('oa-manual-entry')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [searchParams, manualEnabled]);

  useEffect(() => {
    if (currentDraft?.duplicateOfId && !currentDraft.overwriteApproved && currentDraft.reviewStatus === 'pending') {
      setDupDialog(currentDraft);
    }
  }, [currentDraft?.id, currentDraft?.duplicateOfId, currentDraft?.overwriteApproved]);

  function handleFilesSelected(files: File[]): void {
    const pdfFiles = files.filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      setError('Select valid PDF files.');
      return;
    }
    setError(null);
    setUploadFiles((prev) => {
      const existing = new Set(prev.map((p) => p.id));
      const added = pdfFiles
        .filter((f) => !existing.has(uploadFileId(f)))
        .map((file) => ({
          id: uploadFileId(file),
          file,
          progress: 0,
          status: 'pending' as const,
        }));
      return [...prev, ...added];
    });
  }

  function handleRemoveFile(id: string): void {
    setUploadFiles((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleProcessPdfs(): Promise<void> {
    if (uploadFiles.length === 0) {
      setError('Add at least one PDF file.');
      return;
    }
    setProcessing(true);
    setError(null);
    setSuccess(null);
    try {
      setUploadFiles((prev) => prev.map((f) => ({ ...f, status: 'uploading' as const, progress: 40 })));
      await addSampleService.processPdfFiles(
        uploadFiles.map((f) => f.file),
        scope,
      );
      setUploadFiles((prev) => prev.map((f) => ({ ...f, status: 'done' as const, progress: 100 })));
      bump();
      setPhase('review');
      setCurrentIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF processing failed.');
      setUploadFiles((prev) => prev.map((f) => ({ ...f, status: 'error' as const, error: 'Failed' })));
    } finally {
      setProcessing(false);
    }
  }

  function handleManualSubmit(e: React.FormEvent): void {
    e.preventDefault();
    setError(null);
    try {
      addSampleService.createManualDraft(manualForm, scope);
      bump();
      setPhase('review');
      setCurrentIndex(addSampleService.getPendingQueue().length - 1);
      setManualForm((prev) => ({ ...prev, labSampleId: '', sampledAt: '', notes: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Manual entry failed.');
    }
  }

  function handleDuplicateResolve(resolution: DuplicateResolution): void {
    if (!dupDialog) return;
    try {
      addSampleService.resolveDuplicate(dupDialog.id, resolution);
      bump();
      setDupDialog(null);
      if (resolution === 'skip') {
        if (currentIndex >= pendingQueue.length - 1) setCurrentIndex(Math.max(0, currentIndex - 1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duplicate resolution failed.');
    }
  }

  function updateCurrentDraft(changes: Partial<AddSampleDraft>): void {
    if (!currentDraft) return;
    addSampleService.updateDraft(currentDraft.id, changes);
    bump();
  }

  function handleSaveContinue(): void {
    if (!currentDraft) return;
    setError(null);
    setSuccess(null);
    try {
      if (currentDraft.duplicateOfId && currentDraft.overwriteApproved && !overwriteReason.trim()) {
        setError(l(COPY.overwriteReason));
        return;
      }
      const result = addSampleService.saveReviewedDraft(currentDraft.id, actor, {
        overwriteReason: overwriteReason.trim() || undefined,
      });
      setOverwriteReason('');
      if (result.draftActionCreated) setSuccess(l(COPY.actionCreated));
      bump();
      const nextPending = addSampleService.getPendingQueue();
      if (nextPending.length === 0) {
        setPhase('complete');
      } else if (currentIndex >= nextPending.length) {
        setCurrentIndex(nextPending.length - 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    }
  }

  function handleReject(): void {
    if (!currentDraft) return;
    addSampleService.rejectDraft(currentDraft.id);
    bump();
    const nextPending = addSampleService.getPendingQueue();
    if (nextPending.length === 0) setPhase('complete');
    else if (currentIndex >= nextPending.length) setCurrentIndex(nextPending.length - 1);
  }

  function handleFinishBatch(): void {
    setPhase('complete');
  }

  function handleNewBatch(): void {
    addSampleService.clearQueue();
    setUploadFiles([]);
    setCurrentIndex(0);
    setPhase('upload');
    bump();
  }

  const labParamRows = currentDraft?.labParameters.map((p) => ({
    id: p.id,
    label: p.label,
    value: `${p.value}${p.unit ? ` ${p.unit}` : ''}`,
    cellColor: p.cellColor,
  })) ?? [];

  const labColumns: DataTableColumn<(typeof labParamRows)[number]>[] = [
    { id: 'label', header: l(COPY.colParam), accessor: 'label' },
    {
      id: 'value',
      header: l(COPY.colValue),
      accessor: 'value',
    },
    {
      id: 'color',
      header: l(COPY.colColor),
      renderCell: (row) => (
        <StatusBadge variant={cellColorVariant(row.cellColor)} label={row.cellColor} />
      ),
    },
  ];

  if (phase === 'complete') {
    return (
      <div className="ur-page acc-add-sample">
        <PageHeader title={l(COPY.title)} subtitle={l(COPY.subtitle)} />
        <SectionCard title={l(COPY.completeTitle)} subtitle={l(COPY.completeDesc)}>
          <EmptyState
            title={l(COPY.completeTitle)}
            description={`${counters.saved} saved · ${counters.skipped} skipped · ${counters.rejected} rejected`}
            action={
              <button type="button" className="acc-btn acc-btn--primary" onClick={handleNewBatch}>
                {l(COPY.btnNewBatch)}
              </button>
            }
          />
        </SectionCard>
      </div>
    );
  }

  if (phase === 'review') {
    if (pendingQueue.length === 0) {
      return (
        <div className="ur-page acc-add-sample">
          <PageHeader title={l(COPY.title)} subtitle={l(COPY.subtitle)} />
          <EmptyState
            title={l(COPY.emptyQueue)}
            action={
              <button type="button" className="acc-btn acc-btn--primary" onClick={() => setPhase('upload')}>
                {l(COPY.secUpload)}
              </button>
            }
          />
        </div>
      );
    }

    const duplicateExisting = currentDraft?.duplicateOfId
      ? oilSampleService.findById(currentDraft.duplicateOfId)
      : null;

    return (
      <div className="ur-page acc-add-sample">
        <PageHeader
          title={l(COPY.title)}
          subtitle={l(COPY.subtitle)}
          status={{ variant: 'pending-review', label: l(COPY.badge) }}
          actions={
            counters.pending === 0 ? (
              <button type="button" className="acc-btn acc-btn--primary" onClick={handleFinishBatch}>
                {l(COPY.btnFinish)}
              </button>
            ) : undefined
          }
        />

        {error && <ErrorState message={error} />}
        {success && (
          <p className="acc-add-sample__success" role="status">{success}</p>
        )}

        <ReviewQueue
          currentIndex={currentIndex}
          total={pendingQueue.length}
          counters={{
            pending: counters.pending,
            saved: counters.saved,
            rejected: counters.rejected,
            total: counters.total,
          }}
          currentLabel={currentDraft?.labSampleId}
          status={
            currentDraft
              ? { variant: reportStatusVariant(currentDraft.reportStatus), label: currentDraft.reportStatus }
              : undefined
          }
          onPrevious={currentIndex > 0 ? () => setCurrentIndex((i) => i - 1) : undefined}
          onNext={currentIndex < pendingQueue.length - 1 ? () => setCurrentIndex((i) => i + 1) : undefined}
          onSaveContinue={handleSaveContinue}
          onReject={handleReject}
          saveLabel={l(COPY.btnSaveContinue)}
          rejectLabel={l(COPY.btnReject)}
        >
          {currentDraft && (
            <div className={`acc-add-sample__split ${isMobile ? 'acc-add-sample__split--stack' : ''}`}>
              <SectionCard title={l(COPY.secPdf)} className="acc-add-sample__pdf-panel">
                {currentDraft.importSource === 'pdf' ? (
                  <>
                    <dl className="acc-add-sample__meta">
                      <div><dt>{l(COPY.pdfFile)}</dt><dd>{currentDraft.pdf.fileName || l(COPY.none)}</dd></div>
                      <div><dt>{l(COPY.pdfStatus)}</dt><dd>{currentDraft.pdf.uploadStatus}</dd></div>
                      <div><dt>{l(COPY.pdfDriveId)}</dt><dd>{currentDraft.pdf.driveFileId ?? l(COPY.none)}</dd></div>
                    </dl>
                    <p className="acc-add-sample__pdf-msg">{currentDraft.pdf.uploadMessage}</p>
                    <div className="acc-add-sample__pdf-preview" aria-label={l(COPY.pdfPlaceholder)}>
                      {currentDraft.pdf.localObjectUrl ? (
                        <iframe
                          title={currentDraft.pdf.fileName}
                          src={currentDraft.pdf.localObjectUrl}
                          className="acc-add-sample__pdf-frame"
                        />
                      ) : (
                        <p>{l(COPY.pdfPlaceholder)}</p>
                      )}
                    </div>
                    {(currentDraft.pdf.driveUrl || currentDraft.pdf.localObjectUrl) && (
                      <a
                        href={currentDraft.pdf.driveUrl ?? currentDraft.pdf.localObjectUrl ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="acc-btn acc-btn--secondary"
                      >
                        {l(COPY.btnOpenPdf)}
                      </a>
                    )}
                  </>
                ) : (
                  <EmptyState title={l(COPY.secManual)} description={currentDraft.pdf.uploadMessage} />
                )}
              </SectionCard>

              <div className="acc-add-sample__form-panel">
                <SectionCard title={l(COPY.secMeta)}>
                  <div className="acc-add-sample__form-grid">
                    <label className="acc-add-sample__field">
                      <span>{l(COPY.fldEquip)}</span>
                      <input
                        className="ur-form-input"
                        value={currentDraft.equipmentId}
                        onChange={(e) => updateCurrentDraft({ equipmentId: e.target.value })}
                      />
                    </label>
                    <label className="acc-add-sample__field">
                      <span>{l(COPY.fldLp)}</span>
                      <input
                        className="ur-form-input"
                        value={currentDraft.lubricationPointId ?? ''}
                        onChange={(e) => updateCurrentDraft({ lubricationPointId: e.target.value || null })}
                      />
                      {currentDraft.suggestedLpId && currentDraft.suggestedLpId !== currentDraft.lubricationPointId && (
                        <button
                          type="button"
                          className="acc-btn acc-btn--ghost acc-btn--sm"
                          onClick={() => updateCurrentDraft({ lubricationPointId: currentDraft.suggestedLpId })}
                        >
                          {l(COPY.fldLpSuggest)}: {currentDraft.suggestedLpId}
                        </button>
                      )}
                    </label>
                    <label className="acc-add-sample__field">
                      <span>{l(COPY.fldSampleId)}</span>
                      <input
                        className="ur-form-input"
                        value={currentDraft.labSampleId}
                        onChange={(e) => updateCurrentDraft({ labSampleId: e.target.value })}
                      />
                    </label>
                    <label className="acc-add-sample__field">
                      <span>{l(COPY.fldDate)}</span>
                      <input
                        type="date"
                        className="ur-form-input"
                        value={currentDraft.sampledAt}
                        onChange={(e) => updateCurrentDraft({ sampledAt: e.target.value })}
                      />
                    </label>
                    <label className="acc-add-sample__field">
                      <span>{l(COPY.fldLub)}</span>
                      <input
                        className="ur-form-input"
                        value={currentDraft.lubricant}
                        onChange={(e) => updateCurrentDraft({ lubricant: e.target.value })}
                      />
                    </label>
                    <div className="acc-add-sample__field">
                      <span>{l(COPY.fldReportStatus)}</span>
                      <StatusBadge
                        variant={reportStatusVariant(currentDraft.reportStatus)}
                        label={currentDraft.reportStatus}
                      />
                    </div>
                    <label className="acc-add-sample__field">
                      <span>{l(COPY.fldContam)}</span>
                      <input
                        className="ur-form-input"
                        value={currentDraft.contaminationRating}
                        onChange={(e) => updateCurrentDraft({ contaminationRating: e.target.value })}
                      />
                    </label>
                    <label className="acc-add-sample__field">
                      <span>{l(COPY.fldEquipRating)}</span>
                      <input
                        className="ur-form-input"
                        value={currentDraft.equipmentRating}
                        onChange={(e) => updateCurrentDraft({ equipmentRating: e.target.value })}
                      />
                    </label>
                    <label className="acc-add-sample__field">
                      <span>{l(COPY.fldLubRating)}</span>
                      <input
                        className="ur-form-input"
                        value={currentDraft.lubricantRating}
                        onChange={(e) => updateCurrentDraft({ lubricantRating: e.target.value })}
                      />
                    </label>
                    <div className="acc-add-sample__field">
                      <span>{l(COPY.fldOcr)}</span>
                      <span>{(currentDraft.ocrConfidence * 100).toFixed(0)}%</span>
                    </div>
                    {currentDraft.trendColumnsIgnored > 0 && (
                      <p className="acc-add-sample__mobil-note">
                        {l(COPY.mobilNote).replace('{n}', String(currentDraft.trendColumnsIgnored))}
                      </p>
                    )}
                    {currentDraft.overwriteApproved && (
                      <label className="acc-add-sample__field acc-add-sample__field--full">
                        <span>{l(COPY.overwriteReason)}</span>
                        <textarea
                          className="ur-form-input"
                          rows={2}
                          value={overwriteReason}
                          onChange={(e) => setOverwriteReason(e.target.value)}
                        />
                      </label>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title={l(COPY.secExtracted)}>
                  {isMobile ? (
                    <CardList
                      items={labParamRows}
                      fields={[
                        { id: 'label', label: l(COPY.colParam), render: (r) => r.label, emphasize: true },
                        { id: 'value', label: l(COPY.colValue), render: (r) => r.value },
                        {
                          id: 'color',
                          label: l(COPY.colColor),
                          render: (r) => <StatusBadge variant={cellColorVariant(r.cellColor)} label={r.cellColor} />,
                        },
                      ]}
                    />
                  ) : currentDraft.labParameters.length > 0 ? (
                    <DataTable
                      columns={labColumns}
                      data={labParamRows}
                    />
                  ) : (
                    <EmptyState title={l(COPY.none)} description={currentDraft.sampleAnalysis} />
                  )}
                  {currentDraft.labParameters.length > 0 && (
                    <p className="acc-add-sample__cell-legend">
                      {l(COPY.fldCellColors)}:{' '}
                      {currentDraft.labParameters.map((p) => p.cellColor).join(', ')}
                    </p>
                  )}
                </SectionCard>
              </div>
            </div>
          )}
        </ReviewQueue>

        <Dialog
          open={dupDialog !== null}
          onClose={() => setDupDialog(null)}
          title={l(COPY.dupTitle)}
          variant="duplicate"
          size="md"
          footer={
            <>
              <button type="button" className="acc-btn acc-btn--ghost" onClick={() => handleDuplicateResolve('skip')}>
                {l(COPY.dupSkip)}
              </button>
              <button type="button" className="acc-btn acc-btn--danger" onClick={() => handleDuplicateResolve('overwrite')}>
                {l(COPY.dupOverwrite)}
              </button>
              <button type="button" className="acc-btn acc-btn--primary" onClick={() => handleDuplicateResolve('manual')}>
                {l(COPY.dupManual)}
              </button>
            </>
          }
        >
          <p>{l(COPY.dupMsg)}</p>
          {duplicateExisting && (
            <dl className="acc-add-sample__meta">
              <div><dt>{l(COPY.fldSampleId)}</dt><dd>{duplicateExisting.labSampleId}</dd></div>
              <div><dt>{l(COPY.fldEquip)}</dt><dd>{duplicateExisting.equipmentId}</dd></div>
              <div><dt>{l(COPY.fldDate)}</dt><dd>{duplicateExisting.sampledAt}</dd></div>
            </dl>
          )}
        </Dialog>
      </div>
    );
  }

  return (
    <div className="ur-page acc-add-sample">
      <PageHeader
        title={l(COPY.title)}
        subtitle={l(COPY.subtitle)}
        status={{ variant: 'info', label: l(COPY.badge) }}
      />

      {error && <ErrorState message={error} />}

      {pdfEnabled && (
        <SectionCard title={l(COPY.secUpload)}>
          {processing ? (
            <LoadingSkeleton variant="card" />
          ) : (
            <>
              <UploadDropZone
                accept=".pdf,application/pdf"
                multiple
                files={uploadFiles}
                onFilesSelected={handleFilesSelected}
                onRemove={handleRemoveFile}
                label={l(COPY.uploadLabel)}
                hint={l(COPY.uploadHint)}
              />
              <div className="acc-add-sample__actions">
                <OilAnalysisActionButton
                  type="button"
                  className="acc-btn acc-btn--primary"
                  allowed={permissions.canCreateSample}
                  onClick={() => void handleProcessPdfs()}
                  disabled={uploadFiles.length === 0 || processing}
                >
                  {processing ? l(COPY.processing) : l(COPY.btnProcess)}
                </OilAnalysisActionButton>
              </div>
            </>
          )}
        </SectionCard>
      )}

      {manualEnabled && (
        <div id="oa-manual-entry">
        <SectionCard title={l(COPY.secManual)}>
          <form onSubmit={handleManualSubmit} className="acc-add-sample__manual-form">
            <EquipmentPicker
              value={manualForm.equipmentId}
              onChange={(equipmentId) => setManualForm((prev) => ({ ...prev, equipmentId }))}
            />
            <label className="acc-add-sample__field">
              <span>{l(COPY.fldLab)}</span>
              <input
                className="ur-form-input"
                value={manualForm.labSampleId}
                onChange={(e) => setManualForm((prev) => ({ ...prev, labSampleId: e.target.value }))}
                required
              />
            </label>
            <label className="acc-add-sample__field">
              <span>{l(COPY.fldDate)}</span>
              <input
                type="date"
                className="ur-form-input"
                value={manualForm.sampledAt}
                onChange={(e) => setManualForm((prev) => ({ ...prev, sampledAt: e.target.value }))}
                required
              />
            </label>
            <label className="acc-add-sample__field">
              <span>{l(COPY.fldLub)}</span>
              <input
                className="ur-form-input"
                value={manualForm.lubricant}
                onChange={(e) => setManualForm((prev) => ({ ...prev, lubricant: e.target.value }))}
              />
            </label>
            <label className="acc-add-sample__field">
              <span>{l(COPY.fldLp)}</span>
              <input
                className="ur-form-input"
                value={manualForm.lubricationPointId}
                onChange={(e) => setManualForm((prev) => ({ ...prev, lubricationPointId: e.target.value }))}
              />
            </label>
            <label className="acc-add-sample__field">
              <span>{l(COPY.fldNotes)}</span>
              <textarea
                className="ur-form-input"
                rows={2}
                value={manualForm.notes}
                onChange={(e) => setManualForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </label>
            <OilAnalysisActionButton
              type="submit"
              className="acc-btn acc-btn--secondary"
              allowed={permissions.canCreateSample}
            >
              {l(COPY.btnManual)}
            </OilAnalysisActionButton>
          </form>
        </SectionCard>
        </div>
      )}

      {pendingQueue.length > 0 && (
        <SectionCard
          title={l(COPY.emptyQueue).replace('No ', '')}
          actions={
            <Link to="#" onClick={(e) => { e.preventDefault(); setPhase('review'); }} className="acc-btn acc-btn--ghost">
              {`${counters.pending} pending`}
            </Link>
          }
        />
      )}
    </div>
  );
}
