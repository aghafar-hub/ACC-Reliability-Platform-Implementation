// apps/owner-center/src/pages/WorkflowApprovalPage.tsx
// Workflow & Approval Center — functional page backed by sdk.workflows.
//
// Phase 1G: replaces the static placeholder with real workflow definition data.
// No auth, no route guards, no real notification delivery.
// Bilingual EN/AR with RTL support.

import React, { useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePlatformSdk } from '../context/SdkContext';
import { SummaryCard } from '../components/SummaryCard';
import { StatusChip } from '../components/StatusChip';
import type { ChipStatus } from '../components/StatusChip';
import type { WorkflowDefinitionRecord, WorkflowType } from '@acc-reliability/sdk';
import {
  WorkflowLifecycleError,
  WorkflowDefinitionDuplicateError,
} from '@acc-reliability/sdk';

// ── Locale helpers ────────────────────────────────────────────────────────────

interface L10n { en: string; ar: string; }
function t(b: L10n, locale: string): string {
  return locale === 'ar' ? b.ar : b.en;
}

// ── Copy ──────────────────────────────────────────────────────────────────────

const COPY = {
  pageTitle:        { en: 'Workflow & Approval Center',  ar: 'مركز سير العمل والموافقة' },
  pageDesc:         { en: 'Define workflow processes, configure approval routing, manage delegation and SLA rules, set escalation paths, and control workflow versioning for all platform modules.', ar: 'تعريف عمليات سير العمل وتكوين توجيه الموافقة وإدارة التفويض وقواعد SLA وتعيين مسارات التصعيد والتحكم في إصدارات سير العمل لجميع وحدات المنصة.' },
  liveData:         { en: 'Live data',                     ar: 'بيانات حية' },
  ruleHeading:      { en: 'Module Boundary Rule',          ar: 'قاعدة حدود الوحدة' },
  ruleText:         { en: 'Business modules submit workflow requests only. Workflow definitions, approvers, routing, delegation, SLA, escalation and versioning are centrally managed by the Workflow & Approval Center.', ar: 'تُقدّم وحدات الأعمال طلبات سير العمل فقط. تُدار تعريفات سير العمل والمعتمدون والتوجيه والتفويض وSLA والتصعيد والإصدارات مركزياً من قِبل مركز سير العمل والموافقة.' },
  activeWorkflows:  { en: 'Active Workflows',              ar: 'سير العمل النشطة' },
  pendingApprovals: { en: 'Pending Approvals',           ar: 'الموافقات المعلقة' },
  slaRules:         { en: 'SLA Rules',                     ar: 'قواعد SLA' },
  escalations:      { en: 'Escalations',                   ar: 'التصعيدات' },
  createBtn:        { en: '+ Create Workflow',             ar: '+ إنشاء سير عمل' },
  filterAll:        { en: 'All Types',                     ar: 'جميع الأنواع' },
  filterSequential: { en: 'Sequential',                    ar: 'تسلسلي' },
  filterParallel:   { en: 'Parallel',                      ar: 'متوازي' },
  filterConditional:{ en: 'Conditional',                  ar: 'شرطي' },
  colName:          { en: 'Workflow',                      ar: 'سير العمل' },
  colStatus:        { en: 'Status',                        ar: 'الحالة' },
  colVersion:       { en: 'Version',                       ar: 'الإصدار' },
  colType:          { en: 'Type',                          ar: 'النوع' },
  colSla:           { en: 'SLA',                           ar: 'SLA' },
  colSteps:         { en: 'Steps',                         ar: 'الخطوات' },
  colUpdated:       { en: 'Last Updated',                  ar: 'آخر تحديث' },
  colActions:       { en: 'Actions',                       ar: 'الإجراءات' },
  noRecords:        { en: 'No workflow definitions yet.',  ar: 'لا توجد تعريفات سير عمل بعد.' },
  actEdit:          { en: 'Edit',                          ar: 'تعديل' },
  actPublish:       { en: 'Publish',                       ar: 'نشر' },
  actDisable:       { en: 'Disable',                       ar: 'تعطيل' },
  actArchive:       { en: 'Archive',                       ar: 'أرشفة' },
  actRestore:       { en: 'Restore',                       ar: 'استعادة' },
  dlgCreateTitle:   { en: 'Create Workflow',               ar: 'إنشاء سير عمل' },
  dlgEditTitle:     { en: 'Edit Workflow',                 ar: 'تعديل سير العمل' },
  dlgDisableTitle:  { en: 'Disable Workflow',              ar: 'تعطيل سير العمل' },
  dlgArchiveTitle:  { en: 'Archive Workflow',              ar: 'أرشفة سير العمل' },
  dlgPublishTitle:  { en: 'Confirm Publish',               ar: 'تأكيد النشر' },
  dlgRestoreTitle:  { en: 'Confirm Restore',               ar: 'تأكيد الاستعادة' },
  fldKey:           { en: 'Workflow Key',                  ar: 'مفتاح سير العمل' },
  fldName:          { en: 'Display Name',                  ar: 'الاسم المعروض' },
  fldDescription:   { en: 'Description',                   ar: 'الوصف' },
  fldType:          { en: 'Workflow Type',                 ar: 'نوع سير العمل' },
  fldSla:           { en: 'SLA (hours)',                   ar: 'SLA (ساعات)' },
  fldReason:        { en: 'Reason',                        ar: 'السبب' },
  btnSave:          { en: 'Save',                          ar: 'حفظ' },
  btnCancel:        { en: 'Cancel',                        ar: 'إلغاء' },
  btnConfirm:       { en: 'Confirm',                       ar: 'تأكيد' },
  confirmPublish:   { en: 'This will publish the workflow definition for use by business modules.', ar: 'سينشر هذا تعريف سير العمل لاستخدامه من قِبل وحدات الأعمال.' },
  confirmRestore:   { en: 'This will restore the archived workflow to draft status.', ar: 'سيعيد هذا سير العمل المؤرشف إلى حالة المسودة.' },
  slaHours:         { en: 'h',                             ar: 'س' },
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
    case 'published': return { chipStatus: 'operational', label: 'Published' };
    case 'draft':     return { chipStatus: 'draft',       label: 'Draft'     };
    case 'disabled':  return { chipStatus: 'warning',     label: 'Disabled'  };
    case 'archived':  return { chipStatus: 'maintenance', label: 'Archived'  };
    default:          return { chipStatus: 'draft',       label: status      };
  }
}

function typeLabel(workflowType: WorkflowType, locale: string): string {
  switch (workflowType) {
    case 'sequential':  return t(COPY.filterSequential,  locale);
    case 'parallel':    return t(COPY.filterParallel,    locale);
    case 'conditional': return t(COPY.filterConditional, locale);
    default:            return workflowType;
  }
}

function formatSla(hours: number | undefined, locale: string): string {
  if (hours === undefined) return '—';
  return `${hours}${t(COPY.slaHours, locale)}`;
}

// ── Dialog discriminated union ────────────────────────────────────────────────

type Dialog =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit';     record: WorkflowDefinitionRecord }
  | { kind: 'disable';  record: WorkflowDefinitionRecord }
  | { kind: 'archive';  record: WorkflowDefinitionRecord }
  | { kind: 'publish';  record: WorkflowDefinitionRecord }
  | { kind: 'restore';  record: WorkflowDefinitionRecord };

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
    workflowKey: string; name: string; description: string;
    workflowType: string; slaHours: string;
  }) => void;
}
function CreateWorkflowDialog({ locale, opError, onClose, onCreate }: CreateDialogProps): React.ReactElement {
  const [workflowKey,  setWorkflowKey]  = useState('');
  const [name,         setName]         = useState('');
  const [description,  setDescription]  = useState('');
  const [workflowType, setWorkflowType] = useState('sequential');
  const [slaHours,     setSlaHours]     = useState('48');

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!workflowKey.trim() || !name.trim()) return;
    onCreate({ workflowKey, name, description, workflowType, slaHours });
  }

  return (
    <DialogOverlay title={t(COPY.dlgCreateTitle, locale)} onClose={onClose}>
      <form className="ur-dialog__body" onSubmit={handleSubmit}>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldKey, locale)}</label>
          <input className="ur-form-input" value={workflowKey} onChange={(e) => setWorkflowKey(e.target.value.toLowerCase().replace(/\s+/g, '-'))} required autoFocus />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldName, locale)}</label>
          <input className="ur-form-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldDescription, locale)}</label>
          <input className="ur-form-input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldType, locale)}</label>
          <select className="ur-form-input" value={workflowType} onChange={(e) => setWorkflowType(e.target.value)}>
            <option value="sequential">{t(COPY.filterSequential, locale)}</option>
            <option value="parallel">{t(COPY.filterParallel, locale)}</option>
            <option value="conditional">{t(COPY.filterConditional, locale)}</option>
          </select>
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldSla, locale)}</label>
          <input className="ur-form-input" type="number" min="1" value={slaHours} onChange={(e) => setSlaHours(e.target.value)} />
        </div>
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
  record: WorkflowDefinitionRecord;
  locale: string;
  opError: string | null;
  onClose: () => void;
  onEdit: (record: WorkflowDefinitionRecord, data: {
    name: string; description: string; workflowType: string; slaHours: string;
  }) => void;
}
function EditWorkflowDialog({ record, locale, opError, onClose, onEdit }: EditDialogProps): React.ReactElement {
  const [name,         setName]         = useState(record.name);
  const [description,  setDescription]  = useState(record.description ?? '');
  const [workflowType, setWorkflowType] = useState(record.workflowType);
  const [slaHours,     setSlaHours]     = useState(String(record.slaHours ?? 48));

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    onEdit(record, { name, description, workflowType, slaHours });
  }

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
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldType, locale)}</label>
          <select className="ur-form-input" value={workflowType} onChange={(e) => setWorkflowType(e.target.value as WorkflowType)}>
            <option value="sequential">{t(COPY.filterSequential, locale)}</option>
            <option value="parallel">{t(COPY.filterParallel, locale)}</option>
            <option value="conditional">{t(COPY.filterConditional, locale)}</option>
          </select>
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldSla, locale)}</label>
          <input className="ur-form-input" type="number" min="1" value={slaHours} onChange={(e) => setSlaHours(e.target.value)} />
        </div>
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
  confirmLabel: string;
  confirmClass?: string;
}
function ReasonDialog({ title, locale, opError, onClose, onConfirm, confirmLabel, confirmClass = 'ur-btn--warn' }: ReasonDialogProps): React.ReactElement {
  const [reason, setReason] = useState('');

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!reason.trim()) return;
    onConfirm(reason.trim());
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
          <button type="submit" className={`ur-btn ${confirmClass}`}>{confirmLabel}</button>
        </div>
      </form>
    </DialogOverlay>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  locale: string;
  opError: string | null;
  onClose: () => void;
  onConfirm: () => void;
  confirmClass?: string;
}
function ConfirmDialog({ title, message, confirmLabel, locale, opError, onClose, onConfirm, confirmClass = 'ur-btn--primary' }: ConfirmDialogProps): React.ReactElement {
  return (
    <DialogOverlay title={title} onClose={onClose}>
      <div className="ur-dialog__body">
        <p>{message}</p>
        <InlineError message={opError} />
        <div className="ur-dialog__footer">
          <button type="button" className="ur-btn ur-btn--ghost" onClick={onClose}>{t(COPY.btnCancel, locale)}</button>
          <button type="button" className={`ur-btn ${confirmClass}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </DialogOverlay>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WorkflowApprovalPage(): React.ReactElement {
  const { locale } = useLanguage();
  const sdk = usePlatformSdk();

  const [definitions, setDefinitions] = useState<WorkflowDefinitionRecord[]>(() =>
    sdk.workflows.listDefinitions().definitions as WorkflowDefinitionRecord[],
  );
  const [typeFilter, setTypeFilter] = useState<WorkflowType | 'all'>('all');
  const [dialog, setDialog]         = useState<Dialog>({ kind: 'none' });
  const [opError, setOpError]       = useState<string | null>(null);

  const summary = sdk.workflows.getSummary();

  const refetch = useCallback(() => {
    setDefinitions(sdk.workflows.listDefinitions({ limit: 500 }).definitions as WorkflowDefinitionRecord[]);
  }, [sdk]);

  const filtered = typeFilter === 'all'
    ? definitions
    : definitions.filter((d) => d.workflowType === typeFilter);

  function closeDialog(): void {
    setDialog({ kind: 'none' });
    setOpError(null);
  }

  function handleCreate(data: {
    workflowKey: string; name: string; description: string;
    workflowType: string; slaHours: string;
  }): void {
    try {
      const sla = parseInt(data.slaHours, 10);
      sdk.workflows.createDefinition({
        workflowKey:  data.workflowKey,
        name:         data.name,
        description:  data.description || undefined,
        workflowType: data.workflowType as WorkflowType,
        slaHours:     isNaN(sla) ? undefined : sla,
      });
      refetch();
      closeDialog();
    } catch (e) {
      if (e instanceof WorkflowDefinitionDuplicateError) {
        setOpError(`Workflow key '${data.workflowKey}' already exists.`);
      } else {
        setOpError(e instanceof Error ? e.message : 'Operation failed.');
      }
    }
  }

  function handleEdit(record: WorkflowDefinitionRecord, data: {
    name: string; description: string; workflowType: string; slaHours: string;
  }): void {
    try {
      const sla = parseInt(data.slaHours, 10);
      sdk.workflows.updateDefinition(record.id, {
        name:         data.name,
        description:  data.description || undefined,
        workflowType: data.workflowType as WorkflowType,
        slaHours:     isNaN(sla) ? undefined : sla,
      });
      refetch();
      closeDialog();
    } catch (e) {
      if (e instanceof WorkflowLifecycleError) {
        setOpError(e.message);
      } else {
        setOpError(e instanceof Error ? e.message : 'Operation failed.');
      }
    }
  }

  function handlePublish(record: WorkflowDefinitionRecord): void {
    try {
      sdk.workflows.publishDefinition(record.id);
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Operation failed.');
    }
  }

  function handleDisable(record: WorkflowDefinitionRecord, reason: string): void {
    try {
      sdk.workflows.disableDefinition(record.id, reason);
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Operation failed.');
    }
  }

  function handleArchive(record: WorkflowDefinitionRecord, reason: string): void {
    try {
      sdk.workflows.archiveDefinition(record.id, reason);
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Operation failed.');
    }
  }

  function handleRestore(record: WorkflowDefinitionRecord): void {
    try {
      sdk.workflows.restoreDefinition(record.id);
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Operation failed.');
    }
  }

  return (
    <div className="ur-page">

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
        <SummaryCard value={String(summary.activeWorkflows)}  label={t(COPY.activeWorkflows,  locale)} modifier="neutral" />
        <SummaryCard value={String(summary.pendingApprovals)} label={t(COPY.pendingApprovals, locale)} modifier="warning" />
        <SummaryCard value={String(summary.slaRules)}         label={t(COPY.slaRules,         locale)} modifier="info"    />
        <SummaryCard value={String(summary.escalations)}      label={t(COPY.escalations,      locale)} modifier="caution" />
      </div>

      <div className="ur-toolbar">
        <div className="ur-filter-group">
          <select
            className="ur-form-input ur-form-input--inline"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as WorkflowType | 'all')}
          >
            <option value="all">{t(COPY.filterAll, locale)}</option>
            <option value="sequential">{t(COPY.filterSequential, locale)}</option>
            <option value="parallel">{t(COPY.filterParallel, locale)}</option>
            <option value="conditional">{t(COPY.filterConditional, locale)}</option>
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
              <th>{t(COPY.colStatus, locale)}</th>
              <th>{t(COPY.colVersion, locale)}</th>
              <th>{t(COPY.colType, locale)}</th>
              <th>{t(COPY.colSla, locale)}</th>
              <th>{t(COPY.colSteps, locale)}</th>
              <th>{t(COPY.colUpdated, locale)}</th>
              <th>{t(COPY.colActions, locale)}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="ur-table__empty">
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
                      <div className="ur-user-email">{record.workflowKey}</div>
                    </td>
                    <td>
                      <StatusChip status={chip.chipStatus} label={chip.label} />
                    </td>
                    <td>v{record.version}</td>
                    <td>
                      <span className="ur-badge ur-badge--sm">{typeLabel(record.workflowType, locale)}</span>
                    </td>
                    <td>{formatSla(record.slaHours, locale)}</td>
                    <td>{record.steps.length}</td>
                    <td className="ur-table__date">{formatDate(record.updatedAt)}</td>
                    <td>
                      <div className="ur-action-group">
                        {(record.status === 'draft' || record.status === 'disabled') && (
                          <button
                            className="ur-btn ur-btn--ghost ur-btn--sm"
                            onClick={() => { setOpError(null); setDialog({ kind: 'edit', record }); }}
                          >
                            {t(COPY.actEdit, locale)}
                          </button>
                        )}
                        {(record.status === 'draft' || record.status === 'disabled') && (
                          <button
                            className="ur-btn ur-btn--ghost ur-btn--sm"
                            onClick={() => { setOpError(null); setDialog({ kind: 'publish', record }); }}
                          >
                            {t(COPY.actPublish, locale)}
                          </button>
                        )}
                        {record.status === 'published' && (
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
        <CreateWorkflowDialog locale={locale} opError={opError} onClose={closeDialog} onCreate={handleCreate} />
      )}

      {dialog.kind === 'edit' && (
        <EditWorkflowDialog
          record={dialog.record}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onEdit={handleEdit}
        />
      )}

      {dialog.kind === 'publish' && (
        <ConfirmDialog
          title={t(COPY.dlgPublishTitle, locale)}
          message={t(COPY.confirmPublish, locale)}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onConfirm={() => handlePublish(dialog.record)}
          confirmLabel={t(COPY.actPublish, locale)}
        />
      )}

      {dialog.kind === 'disable' && (
        <ReasonDialog
          title={t(COPY.dlgDisableTitle, locale)}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onConfirm={(reason) => handleDisable(dialog.record, reason)}
          confirmLabel={t(COPY.actDisable, locale)}
        />
      )}

      {dialog.kind === 'archive' && (
        <ReasonDialog
          title={t(COPY.dlgArchiveTitle, locale)}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onConfirm={(reason) => handleArchive(dialog.record, reason)}
          confirmLabel={t(COPY.actArchive, locale)}
          confirmClass="ur-btn--danger"
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
          confirmLabel={t(COPY.actRestore, locale)}
        />
      )}

    </div>
  );
}
