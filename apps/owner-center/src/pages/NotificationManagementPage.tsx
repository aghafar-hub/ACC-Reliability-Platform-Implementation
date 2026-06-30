// apps/owner-center/src/pages/NotificationManagementPage.tsx
// Notification Management Center — functional page backed by sdk.notificationManagement.
//
// Phase 1F: replaces the static placeholder with real configuration data.
// No notification delivery, no auth, no route guards.
// Bilingual EN/AR with RTL support.

import React, { useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePlatformSdk } from '../context/SdkContext';
import { SummaryCard } from '../components/SummaryCard';
import { StatusChip } from '../components/StatusChip';
import type { ChipStatus } from '../components/StatusChip';
import type { NotificationRuleRecord, NotificationObjectType } from '@acc-reliability/sdk';
import {
  NotificationRuleLifecycleError,
  NotificationRuleDuplicateError,
} from '@acc-reliability/sdk';

// ── Locale helpers ────────────────────────────────────────────────────────────

interface L10n { en: string; ar: string; }
function t(b: L10n, locale: string): string {
  return locale === 'ar' ? b.ar : b.en;
}

// ── Copy ──────────────────────────────────────────────────────────────────────

const COPY = {
  pageTitle:        { en: 'Notification Management Center', ar: 'مركز إدارة الإشعارات' },
  pageDesc:         { en: 'Configure notification rules, recipients, delivery channels, message templates, reminder schedules, and escalation paths for all platform events.', ar: 'تكوين قواعد الإشعارات والمستلمين وقنوات التسليم وقوالب الرسائل وجداول التذكير ومسارات التصعيد لجميع أحداث المنصة.' },
  liveData:         { en: 'Live data',                       ar: 'بيانات حية' },
  ruleHeading:      { en: 'Management vs. Inbox Rule',      ar: 'قاعدة الإدارة مقابل صندوق الوارد' },
  ruleText:         { en: 'Notification Center is the user inbox. Notification Management Center controls rules, recipients, templates, channels, reminders, and escalation.', ar: 'مركز الإشعارات هو صندوق وارد المستخدم. يتحكم مركز إدارة الإشعارات في القواعد والمستلمين والقوالب والقنوات والتذكيرات والتصعيد.' },
  activeRules:      { en: 'Active Rules',  ar: 'القواعد النشطة' },
  templates:        { en: 'Templates',     ar: 'القوالب' },
  channels:         { en: 'Channels',      ar: 'القنوات' },
  escalations:      { en: 'Escalations',   ar: 'التصعيدات' },
  createBtn:        { en: '+ Create Configuration',          ar: '+ إنشاء تكوين' },
  filterAll:        { en: 'All Types',                       ar: 'جميع الأنواع' },
  filterRule:       { en: 'Rules',                           ar: 'القواعد' },
  filterTemplate:   { en: 'Templates',                       ar: 'القوالب' },
  filterChannel:    { en: 'Channels',                        ar: 'القنوات' },
  filterReminder:   { en: 'Reminders',                       ar: 'التذكيرات' },
  filterEscalation: { en: 'Escalations',                     ar: 'التصعيدات' },
  colName:          { en: 'Name / Key',                      ar: 'الاسم / المفتاح' },
  colType:          { en: 'Type',                            ar: 'النوع' },
  colStatus:        { en: 'Status',                          ar: 'الحالة' },
  colDescription:   { en: 'Description',                     ar: 'الوصف' },
  colUpdated:       { en: 'Last Updated',                    ar: 'آخر تحديث' },
  colActions:       { en: 'Actions',                         ar: 'الإجراءات' },
  noRecords:        { en: 'No configuration records yet.',   ar: 'لا توجد سجلات تكوين بعد.' },
  actEdit:          { en: 'Edit',                            ar: 'تعديل' },
  actEnable:        { en: 'Enable',                          ar: 'تفعيل' },
  actDisable:       { en: 'Disable',                         ar: 'تعطيل' },
  actArchive:       { en: 'Archive',                         ar: 'أرشفة' },
  actRestore:       { en: 'Restore',                         ar: 'استعادة' },
  dlgCreateTitle:   { en: 'Create Configuration',            ar: 'إنشاء تكوين' },
  dlgEditTitle:     { en: 'Edit Configuration',              ar: 'تعديل التكوين' },
  dlgDisableTitle:  { en: 'Disable Configuration',           ar: 'تعطيل التكوين' },
  dlgArchiveTitle:  { en: 'Archive Configuration',           ar: 'أرشفة التكوين' },
  dlgEnableTitle:   { en: 'Confirm Enable',                  ar: 'تأكيد التفعيل' },
  dlgRestoreTitle:  { en: 'Confirm Restore',                 ar: 'تأكيد الاستعادة' },
  fldType:          { en: 'Configuration Type',              ar: 'نوع التكوين' },
  fldKey:           { en: 'Configuration Key',               ar: 'مفتاح التكوين' },
  fldName:          { en: 'Display Name',                    ar: 'الاسم المعروض' },
  fldDescription:   { en: 'Description',                     ar: 'الوصف' },
  fldReason:        { en: 'Reason',                          ar: 'السبب' },
  btnSave:          { en: 'Save',                            ar: 'حفظ' },
  btnCancel:        { en: 'Cancel',                          ar: 'إلغاء' },
  btnConfirm:       { en: 'Confirm',                         ar: 'تأكيد' },
  confirmEnable:    { en: 'This will enable the configuration record.', ar: 'سيؤدي هذا إلى تفعيل سجل التكوين.' },
  confirmRestore:   { en: 'This will restore the archived configuration to enabled status.', ar: 'سيعيد هذا التكوين المؤرشف إلى الحالة المفعّلة.' },
  typeRule:         { en: 'Rule',         ar: 'قاعدة' },
  typeTemplate:     { en: 'Template',     ar: 'قالب' },
  typeChannel:      { en: 'Channel',      ar: 'قناة' },
  typeReminder:     { en: 'Reminder',     ar: 'تذكير' },
  typeEscalation:   { en: 'Escalation',   ar: 'تصعيد' },
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

function objectTypeLabel(objectType: NotificationObjectType, locale: string): string {
  switch (objectType) {
    case 'rule':        return t(COPY.typeRule,       locale);
    case 'template':    return t(COPY.typeTemplate,   locale);
    case 'channel':     return t(COPY.typeChannel,    locale);
    case 'reminder':    return t(COPY.typeReminder,   locale);
    case 'escalation':  return t(COPY.typeEscalation, locale);
    default:            return objectType;
  }
}

// ── Dialog discriminated union ────────────────────────────────────────────────

type Dialog =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit';     record: NotificationRuleRecord }
  | { kind: 'disable';  record: NotificationRuleRecord }
  | { kind: 'archive';  record: NotificationRuleRecord }
  | { kind: 'enable';   record: NotificationRuleRecord }
  | { kind: 'restore';  record: NotificationRuleRecord };

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
    objectType: string; ruleKey: string; name: string; description: string;
  }) => void;
}
function CreateConfigDialog({ locale, opError, onClose, onCreate }: CreateDialogProps): React.ReactElement {
  const [objectType,  setObjectType]  = useState('rule');
  const [ruleKey,     setRuleKey]     = useState('');
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!ruleKey.trim() || !name.trim()) return;
    onCreate({ objectType, ruleKey, name, description });
  }

  return (
    <DialogOverlay title={t(COPY.dlgCreateTitle, locale)} onClose={onClose}>
      <form className="ur-dialog__body" onSubmit={handleSubmit}>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldType, locale)}</label>
          <select className="ur-form-input" value={objectType} onChange={(e) => setObjectType(e.target.value)}>
            <option value="rule">{t(COPY.typeRule, locale)}</option>
            <option value="template">{t(COPY.typeTemplate, locale)}</option>
            <option value="channel">{t(COPY.typeChannel, locale)}</option>
            <option value="reminder">{t(COPY.typeReminder, locale)}</option>
            <option value="escalation">{t(COPY.typeEscalation, locale)}</option>
          </select>
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldKey, locale)}</label>
          <input className="ur-form-input" value={ruleKey} onChange={(e) => setRuleKey(e.target.value.toLowerCase().replace(/\s+/g, '-'))} required autoFocus />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldName, locale)}</label>
          <input className="ur-form-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldDescription, locale)}</label>
          <input className="ur-form-input" value={description} onChange={(e) => setDescription(e.target.value)} />
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
  record: NotificationRuleRecord;
  locale: string;
  opError: string | null;
  onClose: () => void;
  onEdit: (record: NotificationRuleRecord, data: { name: string; description: string }) => void;
}
function EditConfigDialog({ record, locale, opError, onClose, onEdit }: EditDialogProps): React.ReactElement {
  const [name,        setName]        = useState(record.name);
  const [description, setDescription] = useState(record.description ?? '');

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    onEdit(record, { name, description });
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
        <InlineError message={opError} />
        <div className="ur-dialog__footer">
          <button type="button" className="ur-btn ur-btn--ghost" onClick={onClose}>{t(COPY.btnCancel, locale)}</button>
          <button type="submit" className="ur-btn ur-btn--primary">{t(COPY.btnSave, locale)}</button>
        </div>
      </form>
    </DialogOverlay>
  );
}

// ── Reason dialog (disable / archive) ───────────────────────────────────────

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

export default function NotificationManagementPage(): React.ReactElement {
  const { locale } = useLanguage();
  const sdk = usePlatformSdk();

  const [typeFilter, setTypeFilter] = useState<NotificationObjectType | 'all'>('all');
  const [records, setRecords] = useState<NotificationRuleRecord[]>(
    () => sdk.notificationManagement.list().rules as NotificationRuleRecord[],
  );
  const [summary, setSummary] = useState(() => sdk.notificationManagement.getSummary());
  const [dialog,  setDialog]  = useState<Dialog>({ kind: 'none' });
  const [opError, setOpError] = useState<string | null>(null);

  const filtered = typeFilter === 'all'
    ? records
    : records.filter((r) => r.objectType === typeFilter);

  const refetch = useCallback(() => {
    setRecords(sdk.notificationManagement.list().rules as NotificationRuleRecord[]);
    setSummary(sdk.notificationManagement.getSummary());
  }, [sdk]);

  function closeDialog(): void {
    setDialog({ kind: 'none' });
    setOpError(null);
  }

  function handleCreate(data: {
    objectType: string; ruleKey: string; name: string; description: string;
  }): void {
    try {
      sdk.notificationManagement.create({
        objectType: data.objectType as NotificationObjectType,
        ruleKey:    data.ruleKey,
        name:       data.name,
        ...(data.description.trim() ? { description: data.description } : {}),
      });
      refetch();
      closeDialog();
    } catch (e) {
      if (e instanceof NotificationRuleDuplicateError) {
        setOpError(`Configuration key '${data.ruleKey}' already exists for this type.`);
      } else {
        setOpError(e instanceof Error ? e.message : 'Operation failed.');
      }
    }
  }

  function handleEdit(record: NotificationRuleRecord, data: { name: string; description: string }): void {
    try {
      sdk.notificationManagement.update(record.id, {
        name: data.name,
        description: data.description,
      });
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Operation failed.');
    }
  }

  function handleEnable(record: NotificationRuleRecord): void {
    try {
      sdk.notificationManagement.enable(record.id);
      refetch();
      closeDialog();
    } catch (e) {
      if (e instanceof NotificationRuleLifecycleError) {
        setOpError(`Cannot enable: ${e.message}`);
      } else {
        setOpError(e instanceof Error ? e.message : 'Operation failed.');
      }
    }
  }

  function handleDisable(record: NotificationRuleRecord, reason: string): void {
    try {
      sdk.notificationManagement.disable(record.id, reason);
      refetch();
      closeDialog();
    } catch (e) {
      if (e instanceof NotificationRuleLifecycleError) {
        setOpError(`Cannot disable: ${e.message}`);
      } else {
        setOpError(e instanceof Error ? e.message : 'Operation failed.');
      }
    }
  }

  function handleArchive(record: NotificationRuleRecord, reason: string): void {
    try {
      sdk.notificationManagement.archive(record.id, reason);
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Operation failed.');
    }
  }

  function handleRestore(record: NotificationRuleRecord): void {
    try {
      sdk.notificationManagement.restore(record.id);
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
        <SummaryCard value={String(summary.activeRules)} label={t(COPY.activeRules, locale)} modifier="neutral" />
        <SummaryCard value={String(summary.templates)}   label={t(COPY.templates,   locale)} modifier="info"    />
        <SummaryCard value={String(summary.channels)}    label={t(COPY.channels,    locale)} modifier="warning" />
        <SummaryCard value={String(summary.escalations)} label={t(COPY.escalations, locale)} modifier="caution" />
      </div>

      <div className="ur-toolbar">
        <div className="ur-filter-group">
          <select
            className="ur-form-input ur-form-input--inline"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as NotificationObjectType | 'all')}
          >
            <option value="all">{t(COPY.filterAll, locale)}</option>
            <option value="rule">{t(COPY.filterRule, locale)}</option>
            <option value="template">{t(COPY.filterTemplate, locale)}</option>
            <option value="channel">{t(COPY.filterChannel, locale)}</option>
            <option value="reminder">{t(COPY.filterReminder, locale)}</option>
            <option value="escalation">{t(COPY.filterEscalation, locale)}</option>
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
              <th>{t(COPY.colType, locale)}</th>
              <th>{t(COPY.colStatus, locale)}</th>
              <th>{t(COPY.colDescription, locale)}</th>
              <th>{t(COPY.colUpdated, locale)}</th>
              <th>{t(COPY.colActions, locale)}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="ur-table__empty">
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
                      <div className="ur-user-email">{record.ruleKey}</div>
                    </td>
                    <td>
                      <span className="ur-badge ur-badge--sm">{objectTypeLabel(record.objectType, locale)}</span>
                    </td>
                    <td>
                      <StatusChip status={chip.chipStatus} label={chip.label} />
                    </td>
                    <td className="ur-table__desc">{record.description ?? '—'}</td>
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
        <CreateConfigDialog locale={locale} opError={opError} onClose={closeDialog} onCreate={handleCreate} />
      )}

      {dialog.kind === 'edit' && (
        <EditConfigDialog
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
