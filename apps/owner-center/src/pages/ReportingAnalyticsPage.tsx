// apps/owner-center/src/pages/ReportingAnalyticsPage.tsx
// Reporting & Analytics Center — functional page backed by sdk.reporting.
//
// Phase 1H: replaces the static placeholder with real configuration data.
// No report execution, no charts, no auth, no route guards.
// Bilingual EN/AR with RTL support.

import React, { useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePlatformSdk } from '../context/SdkContext';
import { SummaryCard } from '../components/SummaryCard';
import { StatusChip } from '../components/StatusChip';
import { BackToSettingsLink } from '../components/BackToSettingsLink';
import type { ChipStatus } from '../components/StatusChip';
import type { ReportRecord, ReportObjectType, ExportFormat } from '@acc-reliability/sdk';
import {
  ReportLifecycleError,
  ReportDuplicateError,
} from '@acc-reliability/sdk';

// ── Locale helpers ────────────────────────────────────────────────────────────

interface L10n { en: string; ar: string; }
function t(b: L10n, locale: string): string {
  return locale === 'ar' ? b.ar : b.en;
}

// ── Copy ──────────────────────────────────────────────────────────────────────

const COPY = {
  pageTitle:       { en: 'Reporting & Analytics Center', ar: 'مركز التقارير والتحليلات' },
  pageDesc:        { en: 'Manage report definitions, categories, templates, export profiles, and schedule profiles. Configuration only — no report execution.', ar: 'إدارة تعريفات التقارير والفئات والقوالب وملفات التصدير وملفات الجدولة. تكوين فقط — بدون تنفيذ تقارير.' },
  liveData:        { en: 'Live data', ar: 'بيانات حية' },
  ruleHeading:     { en: 'Module Boundary Rule', ar: 'قاعدة حدود الوحدة' },
  ruleText:        { en: 'Business modules provide data only. Report formatting, scheduling, distribution, dashboard configuration and KPI presentation are centrally managed by the Reporting & Analytics Center.', ar: 'توفر وحدات الأعمال البيانات فقط. تُدار تنسيقات التقارير والجدولة والتوزيع وتكوين لوحة البيانات وعرض KPI مركزياً من قِبل مركز التقارير والتحليلات.' },
  totalReports:    { en: 'Total Reports', ar: 'إجمالي التقارير' },
  enabled:         { en: 'Enabled',       ar: 'مفعّلة' },
  scheduled:       { en: 'Scheduled',     ar: 'مجدولة' },
  archived:        { en: 'Archived',      ar: 'مؤرشفة' },
  createBtn:       { en: '+ Create Report', ar: '+ إنشاء تقرير' },
  filterAll:       { en: 'All Types',     ar: 'جميع الأنواع' },
  filterDefinition:{ en: 'Definitions',   ar: 'التعريفات' },
  filterCategory:  { en: 'Categories',    ar: 'الفئات' },
  filterTemplate:  { en: 'Templates',     ar: 'القوالب' },
  filterExport:    { en: 'Export Profiles', ar: 'ملفات التصدير' },
  filterSchedule:  { en: 'Schedule Profiles', ar: 'ملفات الجدولة' },
  colName:         { en: 'Name',          ar: 'الاسم' },
  colCategory:     { en: 'Category',      ar: 'الفئة' },
  colStatus:       { en: 'Status',        ar: 'الحالة' },
  colFormats:      { en: 'Formats',       ar: 'التنسيقات' },
  colOwner:        { en: 'Owner',         ar: 'المالك' },
  colUpdated:      { en: 'Updated',       ar: 'آخر تحديث' },
  colActions:      { en: 'Actions',       ar: 'الإجراءات' },
  noRecords:       { en: 'No report configuration records yet.', ar: 'لا توجد سجلات تكوين تقارير بعد.' },
  actEdit:         { en: 'Edit',    ar: 'تعديل' },
  actEnable:       { en: 'Enable',  ar: 'تفعيل' },
  actDisable:      { en: 'Disable', ar: 'تعطيل' },
  actArchive:      { en: 'Archive', ar: 'أرشفة' },
  actRestore:      { en: 'Restore', ar: 'استعادة' },
  dlgCreateTitle:  { en: 'Create Report Configuration', ar: 'إنشاء تكوين تقرير' },
  dlgEditTitle:    { en: 'Edit Report Configuration',     ar: 'تعديل تكوين التقرير' },
  dlgDisableTitle: { en: 'Disable Report',  ar: 'تعطيل التقرير' },
  dlgArchiveTitle: { en: 'Archive Report',  ar: 'أرشفة التقرير' },
  dlgEnableTitle:  { en: 'Confirm Enable',  ar: 'تأكيد التفعيل' },
  dlgRestoreTitle: { en: 'Confirm Restore', ar: 'تأكيد الاستعادة' },
  fldType:         { en: 'Configuration Type', ar: 'نوع التكوين' },
  fldKey:          { en: 'Report Key',         ar: 'مفتاح التقرير' },
  fldName:         { en: 'Report Name',        ar: 'اسم التقرير' },
  fldDescription:  { en: 'Description',        ar: 'الوصف' },
  fldCategory:     { en: 'Category',           ar: 'الفئة' },
  fldFormats:      { en: 'Export Formats',     ar: 'تنسيقات التصدير' },
  fldSchedule:     { en: 'Schedule Enabled',   ar: 'الجدولة مفعّلة' },
  fldOwner:        { en: 'Owner User ID',      ar: 'معرّف مالك المستخدم' },
  fldReason:       { en: 'Reason',             ar: 'السبب' },
  btnSave:         { en: 'Save',    ar: 'حفظ' },
  btnCancel:       { en: 'Cancel',  ar: 'إلغاء' },
  btnConfirm:      { en: 'Confirm', ar: 'تأكيد' },
  confirmEnable:   { en: 'This will enable the report configuration record.', ar: 'سيؤدي هذا إلى تفعيل سجل تكوين التقرير.' },
  confirmRestore:  { en: 'This will restore the archived report to enabled status.', ar: 'سيعيد هذا التقرير المؤرشف إلى الحالة المفعّلة.' },
  typeDefinition:  { en: 'Definition',       ar: 'تعريف' },
  typeCategory:    { en: 'Category',         ar: 'فئة' },
  typeTemplate:    { en: 'Template',         ar: 'قالب' },
  typeExport:      { en: 'Export Profile',   ar: 'ملف تصدير' },
  typeSchedule:    { en: 'Schedule Profile', ar: 'ملف جدولة' },
  scheduleYes:     { en: 'Yes', ar: 'نعم' },
  scheduleNo:      { en: 'No',  ar: 'لا' },
} as const;

// ── Helper utilities ──────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusChip(status: string): { chipStatus: ChipStatus; label: string } {
  switch (status) {
    case 'enabled':  return { chipStatus: 'operational', label: 'Enabled'  };
    case 'disabled': return { chipStatus: 'warning',     label: 'Disabled' };
    case 'archived': return { chipStatus: 'maintenance', label: 'Archived' };
    default:         return { chipStatus: 'draft',       label: status     };
  }
}

function objectTypeLabel(objectType: ReportObjectType, locale: string): string {
  switch (objectType) {
    case 'definition':       return t(COPY.typeDefinition, locale);
    case 'category':         return t(COPY.typeCategory,   locale);
    case 'template':         return t(COPY.typeTemplate,   locale);
    case 'export-profile':   return t(COPY.typeExport,     locale);
    case 'schedule-profile': return t(COPY.typeSchedule,   locale);
    default:                 return objectType;
  }
}

function formatFormats(record: ReportRecord): string {
  if (record.exportFormats && record.exportFormats.length > 0) {
    return record.exportFormats.join(', ').toUpperCase();
  }
  if (record.settings.allowedFormats && record.settings.allowedFormats.length > 0) {
    return record.settings.allowedFormats.join(', ').toUpperCase();
  }
  return '—';
}

function formatOwner(record: ReportRecord): string {
  if (record.owner) {
    const parts = record.owner.split('.');
    return parts[parts.length - 1] ?? record.owner;
  }
  return '—';
}

// ── Dialog discriminated union ────────────────────────────────────────────────

type Dialog =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit';     record: ReportRecord }
  | { kind: 'disable';  record: ReportRecord }
  | { kind: 'archive';  record: ReportRecord }
  | { kind: 'enable';   record: ReportRecord }
  | { kind: 'restore';  record: ReportRecord };

// ── Sub-components ────────────────────────────────────────────────────────────

interface DialogOverlayProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}
function DialogOverlay({ title, onClose, children }: DialogOverlayProps): React.ReactElement {
  return (
    <div
      className="ur-dialog-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ur-dialog">
        <div className="ur-dialog__header">
          <span className="ur-dialog__title">{title}</span>
          <button className="ur-dialog__close" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface InlineErrorProps { message: string | null; }
function InlineError({ message }: InlineErrorProps): React.ReactElement | null {
  if (!message) return null;
  return <p className="ur-inline-error">{message}</p>;
}

// ── Create dialog ─────────────────────────────────────────────────────────────

interface CreateDialogProps {
  locale: string;
  opError: string | null;
  onClose: () => void;
  onCreate: (data: {
    objectType: string;
    reportKey: string;
    name: string;
    description: string;
    category: string;
    exportFormats: ExportFormat[];
    scheduleEnabled: boolean;
    owner: string;
  }) => void;
}
function CreateReportDialog({ locale, opError, onClose, onCreate }: CreateDialogProps): React.ReactElement {
  const [objectType,      setObjectType]      = useState('definition');
  const [reportKey,       setReportKey]       = useState('');
  const [name,            setName]            = useState('');
  const [description,     setDescription]     = useState('');
  const [category,        setCategory]        = useState('');
  const [exportFormats,   setExportFormats]   = useState<ExportFormat[]>(['pdf']);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [owner,           setOwner]           = useState('platform.admin');

  function toggleFormat(fmt: ExportFormat): void {
    setExportFormats((prev) =>
      prev.includes(fmt) ? prev.filter((f) => f !== fmt) : [...prev, fmt],
    );
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!reportKey.trim() || !name.trim()) return;
    onCreate({ objectType, reportKey, name, description, category, exportFormats, scheduleEnabled, owner });
  }

  const isDefinition = objectType === 'definition';

  return (
    <DialogOverlay title={t(COPY.dlgCreateTitle, locale)} onClose={onClose}>
      <form className="ur-dialog__body" onSubmit={handleSubmit}>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldType, locale)}</label>
          <select className="ur-form-input" value={objectType} onChange={(e) => setObjectType(e.target.value)}>
            <option value="definition">{t(COPY.typeDefinition, locale)}</option>
            <option value="category">{t(COPY.typeCategory, locale)}</option>
            <option value="template">{t(COPY.typeTemplate, locale)}</option>
            <option value="export-profile">{t(COPY.typeExport, locale)}</option>
            <option value="schedule-profile">{t(COPY.typeSchedule, locale)}</option>
          </select>
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldKey, locale)}</label>
          <input className="ur-form-input" value={reportKey} onChange={(e) => setReportKey(e.target.value.toLowerCase().replace(/\s+/g, '-'))} required autoFocus />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldName, locale)}</label>
          <input className="ur-form-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldDescription, locale)}</label>
          <input className="ur-form-input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {isDefinition && (
          <>
            <div className="ur-form-field">
              <label className="ur-form-label">{t(COPY.fldCategory, locale)}</label>
              <input className="ur-form-input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="equipment-health" />
            </div>
            <div className="ur-form-field">
              <label className="ur-form-label">{t(COPY.fldFormats, locale)}</label>
              <div className="ur-checkbox-group">
                {(['pdf', 'xlsx', 'csv', 'html'] as ExportFormat[]).map((fmt) => (
                  <label key={fmt} className="ur-checkbox-label">
                    <input
                      type="checkbox"
                      checked={exportFormats.includes(fmt)}
                      onChange={() => toggleFormat(fmt)}
                    />
                    {fmt.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>
            <div className="ur-form-field">
              <label className="ur-checkbox-label">
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={(e) => setScheduleEnabled(e.target.checked)}
                />
                {t(COPY.fldSchedule, locale)}
              </label>
            </div>
            <div className="ur-form-field">
              <label className="ur-form-label">{t(COPY.fldOwner, locale)}</label>
              <input className="ur-form-input" value={owner} onChange={(e) => setOwner(e.target.value)} />
            </div>
          </>
        )}
        <InlineError message={opError} />
        <div className="ur-dialog__footer">
          <button type="button" className="ur-btn ur-btn--ghost" onClick={onClose}>{t(COPY.btnCancel, locale)}</button>
          <button type="submit" className="ur-btn ur-btn--primary">{t(COPY.btnSave, locale)}</button>
        </div>
      </form>
    </DialogOverlay>
  );
}

// ── Edit dialog ───────────────────────────────────────────────────────────────

interface EditDialogProps {
  record: ReportRecord;
  locale: string;
  opError: string | null;
  onClose: () => void;
  onEdit: (record: ReportRecord, data: {
    name: string;
    description: string;
    category: string;
    exportFormats: ExportFormat[];
    scheduleEnabled: boolean;
    owner: string;
  }) => void;
}
function EditReportDialog({ record, locale, opError, onClose, onEdit }: EditDialogProps): React.ReactElement {
  const [name,            setName]            = useState(record.name);
  const [description,     setDescription]     = useState(record.description ?? '');
  const [category,        setCategory]        = useState(record.category ?? '');
  const [exportFormats,   setExportFormats]   = useState<ExportFormat[]>([...(record.exportFormats ?? ['pdf'])]);
  const [scheduleEnabled, setScheduleEnabled] = useState(record.scheduleEnabled ?? false);
  const [owner,           setOwner]           = useState(record.owner ?? 'platform.admin');

  function toggleFormat(fmt: ExportFormat): void {
    setExportFormats((prev) =>
      prev.includes(fmt) ? prev.filter((f) => f !== fmt) : [...prev, fmt],
    );
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    onEdit(record, { name, description, category, exportFormats, scheduleEnabled, owner });
  }

  const isDefinition = record.objectType === 'definition';

  return (
    <DialogOverlay title={`${t(COPY.dlgEditTitle, locale)} — ${record.name}`} onClose={onClose}>
      <form className="ur-dialog__body" onSubmit={handleSubmit}>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldName, locale)}</label>
          <input className="ur-form-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldDescription, locale)}</label>
          <input className="ur-form-input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {isDefinition && (
          <>
            <div className="ur-form-field">
              <label className="ur-form-label">{t(COPY.fldCategory, locale)}</label>
              <input className="ur-form-input" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="ur-form-field">
              <label className="ur-form-label">{t(COPY.fldFormats, locale)}</label>
              <div className="ur-checkbox-group">
                {(['pdf', 'xlsx', 'csv', 'html'] as ExportFormat[]).map((fmt) => (
                  <label key={fmt} className="ur-checkbox-label">
                    <input
                      type="checkbox"
                      checked={exportFormats.includes(fmt)}
                      onChange={() => toggleFormat(fmt)}
                    />
                    {fmt.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>
            <div className="ur-form-field">
              <label className="ur-checkbox-label">
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={(e) => setScheduleEnabled(e.target.checked)}
                />
                {t(COPY.fldSchedule, locale)}
              </label>
            </div>
            <div className="ur-form-field">
              <label className="ur-form-label">{t(COPY.fldOwner, locale)}</label>
              <input className="ur-form-input" value={owner} onChange={(e) => setOwner(e.target.value)} />
            </div>
          </>
        )}
        <InlineError message={opError} />
        <div className="ur-dialog__footer">
          <button type="button" className="ur-btn ur-btn--ghost" onClick={onClose}>{t(COPY.btnCancel, locale)}</button>
          <button type="submit" className="ur-btn ur-btn--primary">{t(COPY.btnSave, locale)}</button>
        </div>
      </form>
    </DialogOverlay>
  );
}

// ── Reason dialog ─────────────────────────────────────────────────────────────

interface ReasonDialogProps {
  title: string;
  locale: string;
  opError: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}
function ReasonDialog({ title, locale, opError, onClose, onConfirm }: ReasonDialogProps): React.ReactElement {
  const [reason, setReason] = useState('');

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!reason.trim()) return;
    onConfirm(reason);
  }

  return (
    <DialogOverlay title={title} onClose={onClose}>
      <form className="ur-dialog__body" onSubmit={handleSubmit}>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldReason, locale)}</label>
          <input className="ur-form-input" value={reason} onChange={(e) => setReason(e.target.value)} required autoFocus />
        </div>
        <InlineError message={opError} />
        <div className="ur-dialog__footer">
          <button type="button" className="ur-btn ur-btn--ghost" onClick={onClose}>{t(COPY.btnCancel, locale)}</button>
          <button type="submit" className="ur-btn ur-btn--primary">{t(COPY.btnConfirm, locale)}</button>
        </div>
      </form>
    </DialogOverlay>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  title: string;
  message: string;
  locale: string;
  opError: string | null;
  onClose: () => void;
  onConfirm: () => void;
}
function ConfirmDialog({ title, message, locale, opError, onClose, onConfirm }: ConfirmDialogProps): React.ReactElement {
  return (
    <DialogOverlay title={title} onClose={onClose}>
      <div className="ur-dialog__body">
        <p>{message}</p>
        <InlineError message={opError} />
        <div className="ur-dialog__footer">
          <button type="button" className="ur-btn ur-btn--ghost" onClick={onClose}>{t(COPY.btnCancel, locale)}</button>
          <button type="button" className="ur-btn ur-btn--primary" onClick={onConfirm}>{t(COPY.btnConfirm, locale)}</button>
        </div>
      </div>
    </DialogOverlay>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportingAnalyticsPage(): React.ReactElement {
  const { locale } = useLanguage();
  const sdk = usePlatformSdk();

  const [typeFilter, setTypeFilter] = useState<ReportObjectType | 'all'>('definition');
  const [records, setRecords] = useState<ReportRecord[]>(
    () => sdk.reporting.list().reports as ReportRecord[],
  );
  const [summary, setSummary] = useState(() => sdk.reporting.getSummary());
  const [dialog,  setDialog]  = useState<Dialog>({ kind: 'none' });
  const [opError, setOpError] = useState<string | null>(null);

  const filtered = typeFilter === 'all'
    ? records
    : records.filter((r) => r.objectType === typeFilter);

  const refetch = useCallback(() => {
    setRecords(sdk.reporting.list().reports as ReportRecord[]);
    setSummary(sdk.reporting.getSummary());
  }, [sdk]);

  function closeDialog(): void {
    setDialog({ kind: 'none' });
    setOpError(null);
  }

  function handleCreate(data: {
    objectType: string;
    reportKey: string;
    name: string;
    description: string;
    category: string;
    exportFormats: ExportFormat[];
    scheduleEnabled: boolean;
    owner: string;
  }): void {
    try {
      const isDefinition = data.objectType === 'definition';
      sdk.reporting.create({
        objectType: data.objectType as ReportObjectType,
        reportKey:  data.reportKey,
        name:       data.name,
        ...(data.description.trim() ? { description: data.description } : {}),
        ...(isDefinition && data.category.trim() ? { category: data.category } : {}),
        ...(isDefinition && data.exportFormats.length > 0 ? { exportFormats: data.exportFormats } : {}),
        ...(isDefinition ? { scheduleEnabled: data.scheduleEnabled } : {}),
        ...(isDefinition && data.owner.trim() ? { owner: data.owner as ReportRecord['owner'] } : {}),
      });
      refetch();
      closeDialog();
    } catch (e) {
      if (e instanceof ReportDuplicateError) {
        setOpError(`Report key '${data.reportKey}' already exists for this type.`);
      } else {
        setOpError(e instanceof Error ? e.message : 'Operation failed.');
      }
    }
  }

  function handleEdit(record: ReportRecord, data: {
    name: string;
    description: string;
    category: string;
    exportFormats: ExportFormat[];
    scheduleEnabled: boolean;
    owner: string;
  }): void {
    try {
      const isDefinition = record.objectType === 'definition';
      sdk.reporting.update(record.id, {
        name: data.name,
        description: data.description,
        ...(isDefinition ? { category: data.category } : {}),
        ...(isDefinition ? { exportFormats: data.exportFormats } : {}),
        ...(isDefinition ? { scheduleEnabled: data.scheduleEnabled } : {}),
        ...(isDefinition && data.owner.trim() ? { owner: data.owner as ReportRecord['owner'] } : {}),
      });
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Operation failed.');
    }
  }

  function handleEnable(record: ReportRecord): void {
    try {
      sdk.reporting.enable(record.id);
      refetch();
      closeDialog();
    } catch (e) {
      if (e instanceof ReportLifecycleError) {
        setOpError(`Cannot enable: ${e.message}`);
      } else {
        setOpError(e instanceof Error ? e.message : 'Operation failed.');
      }
    }
  }

  function handleDisable(record: ReportRecord, reason: string): void {
    try {
      sdk.reporting.disable(record.id, reason);
      refetch();
      closeDialog();
    } catch (e) {
      if (e instanceof ReportLifecycleError) {
        setOpError(`Cannot disable: ${e.message}`);
      } else {
        setOpError(e instanceof Error ? e.message : 'Operation failed.');
      }
    }
  }

  function handleArchive(record: ReportRecord, reason: string): void {
    try {
      sdk.reporting.archive(record.id, reason);
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Operation failed.');
    }
  }

  function handleRestore(record: ReportRecord): void {
    try {
      sdk.reporting.restore(record.id);
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Operation failed.');
    }
  }

  return (
    <div className="ur-page">

      <BackToSettingsLink />

      <div className="ur-page__header">
        <div className="ur-page__header-text">
          <h1 className="ur-page__title">{t(COPY.pageTitle, locale)}</h1>
          <p className="ur-page__desc">{t(COPY.pageDesc, locale)}</p>
        </div>
        <StatusChip
          status="operational"
          label={t(COPY.liveData, locale)}
          className="ur-page__sdk-badge"
        />
      </div>

      <div className="con-rule" role="note" aria-label={t(COPY.ruleHeading, locale)}>
        <span className="con-rule__heading">{t(COPY.ruleHeading, locale)}</span>
        <span className="con-rule__text">{t(COPY.ruleText, locale)}</span>
      </div>

      <div className="ur-summary-grid">
        <SummaryCard value={String(summary.totalReports)} label={t(COPY.totalReports, locale)} modifier="neutral" />
        <SummaryCard value={String(summary.enabled)}      label={t(COPY.enabled,      locale)} modifier="info"    />
        <SummaryCard value={String(summary.scheduled)}    label={t(COPY.scheduled,    locale)} modifier="warning" />
        <SummaryCard value={String(summary.archived)}     label={t(COPY.archived,     locale)} modifier="caution" />
      </div>

      <div className="ur-toolbar">
        <div className="ur-filter-group">
          <select
            className="ur-form-input ur-form-input--inline"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ReportObjectType | 'all')}
          >
            <option value="all">{t(COPY.filterAll, locale)}</option>
            <option value="definition">{t(COPY.filterDefinition, locale)}</option>
            <option value="category">{t(COPY.filterCategory, locale)}</option>
            <option value="template">{t(COPY.filterTemplate, locale)}</option>
            <option value="export-profile">{t(COPY.filterExport, locale)}</option>
            <option value="schedule-profile">{t(COPY.filterSchedule, locale)}</option>
          </select>
        </div>
        <button
          className="ur-btn ur-btn--primary"
          onClick={() => { setOpError(null); setDialog({ kind: 'create' }); }}
        >
          {t(COPY.createBtn, locale)}
        </button>
      </div>

      <div className="ur-table-wrap">
        <table className="ur-table">
          <thead>
            <tr>
              <th>{t(COPY.colName, locale)}</th>
              <th>{t(COPY.colCategory, locale)}</th>
              <th>{t(COPY.colStatus, locale)}</th>
              <th>{t(COPY.colFormats, locale)}</th>
              <th>{t(COPY.colOwner, locale)}</th>
              <th>{t(COPY.colUpdated, locale)}</th>
              <th>{t(COPY.colActions, locale)}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="ur-table__empty">
                  {t(COPY.noRecords, locale)}
                </td>
              </tr>
            ) : (
              filtered.map((record) => {
                const chip = statusChip(record.status);
                return (
                  <tr key={record.id}>
                    <td>
                      <div className="ur-user-name">{record.name}</div>
                      <div className="ur-user-email">{record.reportKey}</div>
                      {record.objectType !== 'definition' && (
                        <span className="ur-badge ur-badge--sm">{objectTypeLabel(record.objectType, locale)}</span>
                      )}
                    </td>
                    <td>{record.category ?? '—'}</td>
                    <td>
                      <StatusChip status={chip.chipStatus} label={chip.label} />
                    </td>
                    <td>{formatFormats(record)}</td>
                    <td>{formatOwner(record)}</td>
                    <td className="ur-table__date">{formatDate(record.updatedAt)}</td>
                    <td>
                      <div className="ur-action-group">
                        <button
                          className="ur-btn ur-btn--ghost ur-btn--sm"
                          onClick={() => { setOpError(null); setDialog({ kind: 'edit', record }); }}
                        >
                          {t(COPY.actEdit, locale)}
                        </button>
                        {record.status === 'disabled' && (
                          <button
                            className="ur-btn ur-btn--ghost ur-btn--sm"
                            onClick={() => { setOpError(null); setDialog({ kind: 'enable', record }); }}
                          >
                            {t(COPY.actEnable, locale)}
                          </button>
                        )}
                        {record.status === 'enabled' && (
                          <button
                            className="ur-btn ur-btn--ghost ur-btn--sm ur-btn--warn"
                            onClick={() => { setOpError(null); setDialog({ kind: 'disable', record }); }}
                          >
                            {t(COPY.actDisable, locale)}
                          </button>
                        )}
                        {record.status !== 'archived' && (
                          <button
                            className="ur-btn ur-btn--ghost ur-btn--sm ur-btn--danger"
                            onClick={() => { setOpError(null); setDialog({ kind: 'archive', record }); }}
                          >
                            {t(COPY.actArchive, locale)}
                          </button>
                        )}
                        {record.status === 'archived' && (
                          <button
                            className="ur-btn ur-btn--ghost ur-btn--sm"
                            onClick={() => { setOpError(null); setDialog({ kind: 'restore', record }); }}
                          >
                            {t(COPY.actRestore, locale)}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {dialog.kind === 'create' && (
        <CreateReportDialog locale={locale} opError={opError} onClose={closeDialog} onCreate={handleCreate} />
      )}

      {dialog.kind === 'edit' && (
        <EditReportDialog
          record={dialog.record}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onEdit={handleEdit}
        />
      )}

      {dialog.kind === 'disable' && (
        <ReasonDialog
          title={t(COPY.dlgDisableTitle, locale)}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onConfirm={(reason) => handleDisable(dialog.record, reason)}
        />
      )}

      {dialog.kind === 'archive' && (
        <ReasonDialog
          title={t(COPY.dlgArchiveTitle, locale)}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onConfirm={(reason) => handleArchive(dialog.record, reason)}
        />
      )}

      {dialog.kind === 'enable' && (
        <ConfirmDialog
          title={t(COPY.dlgEnableTitle, locale)}
          message={t(COPY.confirmEnable, locale)}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onConfirm={() => handleEnable(dialog.record)}
        />
      )}

      {dialog.kind === 'restore' && (
        <ConfirmDialog
          title={t(COPY.dlgRestoreTitle, locale)}
          message={t(COPY.confirmRestore, locale)}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onConfirm={() => handleRestore(dialog.record)}
        />
      )}

    </div>
  );
}
