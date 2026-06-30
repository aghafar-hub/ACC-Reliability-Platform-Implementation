// apps/owner-center/src/pages/ContractorsPage.tsx
// Contractors Center — fully functional page backed by sdk.contractors.
//
// Phase 1D: replaces the static placeholder with real data.
// No auth, no route guards, no permission filtering.
// Bilingual EN/AR with RTL support.

import React, { useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePlatformSdk } from '../context/SdkContext';
import { SummaryCard } from '../components/SummaryCard';
import { StatusChip } from '../components/StatusChip';
import type { ChipStatus } from '../components/StatusChip';
import type { ContractorRecord, ContractorId } from '@acc-reliability/sdk';
import { ContractorLifecycleError, ContractorDuplicateError } from '@acc-reliability/sdk';
import { createContractorId } from '@acc-reliability/sdk';

// ── Locale helpers ────────────────────────────────────────────────────────────

interface L10n { en: string; ar: string; }
function t(b: L10n, locale: string): string {
  return locale === 'ar' ? b.ar : b.en;
}

// ── Copy ──────────────────────────────────────────────────────────────────────

const COPY = {
  pageTitle:        { en: 'Contractors Center',              ar: 'مركز المقاولين'                      },
  pageDesc:         { en: 'Manage contractor profiles, area assignments, and platform access.',          ar: 'إدارة ملفات المقاولين وتعيينات المناطق والوصول للمنصة.' },
  liveData:         { en: 'Live data',                       ar: 'بيانات حية'                           },
  totalContractors: { en: 'Total',                           ar: 'الإجمالي'                             },
  activeLabel:      { en: 'Active',                          ar: 'نشط'                                  },
  inactiveLabel:    { en: 'Inactive',                        ar: 'غير نشط'                              },
  archivedLabel:    { en: 'Archived',                        ar: 'مؤرشف'                                },
  createBtn:        { en: '+ Create Contractor',             ar: '+ إنشاء مقاول'                       },
  colName:          { en: 'Name / Code',                     ar: 'الاسم / الرمز'                        },
  colStatus:        { en: 'Status',                          ar: 'الحالة'                               },
  colContact:       { en: 'Contact',                         ar: 'جهة الاتصال'                          },
  colAreas:         { en: 'Areas',                           ar: 'المناطق'                              },
  colUpdated:       { en: 'Last Updated',                    ar: 'آخر تحديث'                            },
  colActions:       { en: 'Actions',                         ar: 'الإجراءات'                            },
  noContractors:    { en: 'No contractors yet — create the first one.', ar: 'لا يوجد مقاولون بعد.'    },
  actEdit:          { en: 'Edit',                            ar: 'تعديل'                                },
  actActivate:      { en: 'Activate',                        ar: 'تفعيل'                                },
  actDeactivate:    { en: 'Deactivate',                      ar: 'إلغاء التفعيل'                       },
  actArchive:       { en: 'Archive',                         ar: 'أرشفة'                                },
  actRestore:       { en: 'Restore',                         ar: 'استعادة'                              },
  dlgCreateTitle:   { en: 'Create Contractor',               ar: 'إنشاء مقاول'                         },
  dlgEditTitle:     { en: 'Edit Contractor',                 ar: 'تعديل المقاول'                       },
  dlgDeactivateTitle:{ en: 'Deactivate Contractor',          ar: 'إلغاء تفعيل المقاول'                 },
  dlgArchiveTitle:  { en: 'Archive Contractor',              ar: 'أرشفة المقاول'                       },
  dlgRestoreTitle:  { en: 'Confirm Restore',                 ar: 'تأكيد الاستعادة'                     },
  dlgActivateTitle: { en: 'Confirm Activate',                ar: 'تأكيد التفعيل'                        },
  fldName:          { en: 'Full Name',                       ar: 'الاسم الكامل'                         },
  fldShortName:     { en: 'Short Name',                      ar: 'الاسم المختصر'                       },
  fldCode:          { en: 'Contractor Code',                 ar: 'رمز المقاول'                         },
  fldEmail:         { en: 'Email',                           ar: 'البريد الإلكتروني'                   },
  fldPhone:         { en: 'Phone',                           ar: 'الهاتف'                               },
  fldContact:       { en: 'Contact Person',                  ar: 'الشخص المسؤول'                       },
  fldAreas:         { en: 'Areas Owned (comma-separated)',   ar: 'المناطق المملوكة (مفصولة بفاصلة)'   },
  fldReason:        { en: 'Reason',                          ar: 'السبب'                                },
  btnSave:          { en: 'Save',                            ar: 'حفظ'                                  },
  btnCancel:        { en: 'Cancel',                          ar: 'إلغاء'                                },
  btnConfirm:       { en: 'Confirm',                         ar: 'تأكيد'                                },
  confirmActivate:  { en: 'This will set the contractor status to active.',  ar: 'سيُعيد هذا المقاول إلى الحالة النشطة.'      },
  confirmRestore:   { en: 'This will restore the archived contractor to active status.', ar: 'سيُعيد هذا المقاول المؤرشف إلى الحالة النشطة.' },
  ruleHeading:      { en: 'Area Ownership Rule',             ar: 'قاعدة ملكية المنطقة'                 },
  ruleText:         { en: 'One Area belongs to one Contractor. Shared Areas require App Owner approval.', ar: 'كل منطقة تنتمي لمقاول واحد. المناطق المشتركة تتطلب موافقة مالك التطبيق.' },
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
    case 'active':   return { chipStatus: 'operational', label: 'Active'   };
    case 'inactive': return { chipStatus: 'warning',     label: 'Inactive' };
    case 'archived': return { chipStatus: 'maintenance', label: 'Archived' };
    default:         return { chipStatus: 'draft',       label: status     };
  }
}

// ── Dialog discriminated union ────────────────────────────────────────────────

type Dialog =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit';        contractor: ContractorRecord }
  | { kind: 'deactivate';  contractor: ContractorRecord }
  | { kind: 'archive';     contractor: ContractorRecord }
  | { kind: 'activate';    contractor: ContractorRecord }
  | { kind: 'restore';     contractor: ContractorRecord };

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

// ── Create Contractor dialog ──────────────────────────────────────────────────

interface CreateDialogProps {
  locale: string;
  opError: string | null;
  onClose: () => void;
  onCreate: (data: {
    name: string; shortName: string; contractorCode: string;
    email: string; phone: string; contactPerson: string; areasOwned: string;
  }) => void;
}
function CreateContractorDialog({ locale, opError, onClose, onCreate }: CreateDialogProps): React.ReactElement {
  const [name,          setName]          = useState('');
  const [shortName,     setShortName]     = useState('');
  const [contractorCode, setContractorCode] = useState('');
  const [email,         setEmail]         = useState('');
  const [phone,         setPhone]         = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [areasOwned,    setAreasOwned]    = useState('');

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!name.trim() || !shortName.trim() || !contractorCode.trim() || !email.trim()) return;
    onCreate({ name, shortName, contractorCode, email, phone, contactPerson, areasOwned });
  }

  return (
    <DialogOverlay title={t(COPY.dlgCreateTitle, locale)} onClose={onClose}>
      <form className="ur-dialog__body" onSubmit={handleSubmit}>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldName, locale)}</label>
          <input className="ur-form-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldShortName, locale)}</label>
          <input className="ur-form-input" value={shortName} onChange={(e) => setShortName(e.target.value)} required />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldCode, locale)}</label>
          <input className="ur-form-input" value={contractorCode} onChange={(e) => setContractorCode(e.target.value.toUpperCase())} required />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldEmail, locale)}</label>
          <input className="ur-form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldPhone, locale)}</label>
          <input className="ur-form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldContact, locale)}</label>
          <input className="ur-form-input" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldAreas, locale)}</label>
          <input className="ur-form-input" value={areasOwned} onChange={(e) => setAreasOwned(e.target.value)} placeholder="Area-01, Area-02" />
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

// ── Edit Contractor dialog ────────────────────────────────────────────────────

interface EditDialogProps {
  contractor: ContractorRecord;
  locale: string;
  opError: string | null;
  onClose: () => void;
  onEdit: (contractor: ContractorRecord, data: {
    name: string; shortName: string; email: string;
    phone: string; contactPerson: string; areasOwned: string;
  }) => void;
}
function EditContractorDialog({ contractor, locale, opError, onClose, onEdit }: EditDialogProps): React.ReactElement {
  const [name,          setName]          = useState(contractor.name);
  const [shortName,     setShortName]     = useState(contractor.shortName);
  const [email,         setEmail]         = useState(contractor.email);
  const [phone,         setPhone]         = useState(contractor.phone ?? '');
  const [contactPerson, setContactPerson] = useState(contractor.contactPerson ?? '');
  const [areasOwned,    setAreasOwned]    = useState(contractor.areasOwned.join(', '));

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    onEdit(contractor, { name, shortName, email, phone, contactPerson, areasOwned });
  }

  return (
    <DialogOverlay title={`${t(COPY.dlgEditTitle, locale)} — ${contractor.name}`} onClose={onClose}>
      <form className="ur-dialog__body" onSubmit={handleSubmit}>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldName, locale)}</label>
          <input className="ur-form-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldShortName, locale)}</label>
          <input className="ur-form-input" value={shortName} onChange={(e) => setShortName(e.target.value)} required />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldEmail, locale)}</label>
          <input className="ur-form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldPhone, locale)}</label>
          <input className="ur-form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldContact, locale)}</label>
          <input className="ur-form-input" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldAreas, locale)}</label>
          <input className="ur-form-input" value={areasOwned} onChange={(e) => setAreasOwned(e.target.value)} />
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

// ── Reason dialog (Deactivate / Archive) ─────────────────────────────────────

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

// ── Confirm dialog (Activate / Restore) ──────────────────────────────────────

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  locale: string;
  opError: string | null;
  onClose: () => void;
  onConfirm: () => void;
}
function ConfirmDialog({ title, message, confirmLabel, locale, opError, onClose, onConfirm }: ConfirmDialogProps): React.ReactElement {
  return (
    <DialogOverlay title={title} onClose={onClose}>
      <div className="ur-dialog__body">
        <p>{message}</p>
        <InlineError message={opError} />
        <div className="ur-dialog__footer">
          <button type="button" className="ur-btn ur-btn--ghost" onClick={onClose}>{t(COPY.btnCancel, locale)}</button>
          <button type="button" className="ur-btn ur-btn--primary" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </DialogOverlay>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ContractorsPage(): React.ReactElement {
  const { locale } = useLanguage();
  const sdk = usePlatformSdk();

  // ── State ─────────────────────────────────────────────────────────────────

  const [contractors, setContractors] = useState<ContractorRecord[]>(() =>
    sdk.contractors.list().contractors as ContractorRecord[],
  );
  const [dialog,   setDialog]   = useState<Dialog>({ kind: 'none' });
  const [opError,  setOpError]  = useState<string | null>(null);

  // ── Derived counts ────────────────────────────────────────────────────────

  const total    = contractors.length;
  const active   = contractors.filter((c) => c.status === 'active').length;
  const inactive = contractors.filter((c) => c.status === 'inactive').length;
  const archived = contractors.filter((c) => c.status === 'archived').length;

  // ── Helpers ───────────────────────────────────────────────────────────────

  const refetch = useCallback(() => {
    setContractors(sdk.contractors.list().contractors as ContractorRecord[]);
  }, [sdk]);

  function closeDialog(): void {
    setDialog({ kind: 'none' });
    setOpError(null);
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleCreate(data: {
    name: string; shortName: string; contractorCode: string;
    email: string; phone: string; contactPerson: string; areasOwned: string;
  }): void {
    try {
      const areasOwned = data.areasOwned
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      sdk.contractors.create({
        contractorCode: createContractorId(data.contractorCode),
        name:           data.name,
        shortName:      data.shortName,
        email:          data.email,
        phone:          data.phone || undefined,
        contactPerson:  data.contactPerson || undefined,
        areasOwned,
      });
      refetch();
      closeDialog();
    } catch (e) {
      if (e instanceof ContractorDuplicateError) {
        setOpError(`Contractor code '${data.contractorCode}' already exists.`);
      } else {
        setOpError(e instanceof Error ? e.message : 'Operation failed.');
      }
    }
  }

  function handleEdit(contractor: ContractorRecord, data: {
    name: string; shortName: string; email: string;
    phone: string; contactPerson: string; areasOwned: string;
  }): void {
    try {
      const areasOwned = data.areasOwned
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      sdk.contractors.update(contractor.id, {
        name:          data.name,
        shortName:     data.shortName,
        email:         data.email,
        phone:         data.phone || undefined,
        contactPerson: data.contactPerson || undefined,
        areasOwned,
      });
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Operation failed.');
    }
  }

  function handleDeactivate(contractor: ContractorRecord, reason: string): void {
    try {
      sdk.contractors.deactivate(contractor.id, reason);
      refetch();
      closeDialog();
    } catch (e) {
      if (e instanceof ContractorLifecycleError) {
        setOpError(`Cannot deactivate: ${e.message}`);
      } else {
        setOpError(e instanceof Error ? e.message : 'Operation failed.');
      }
    }
  }

  function handleActivate(contractor: ContractorRecord): void {
    try {
      sdk.contractors.activate(contractor.id);
      refetch();
      closeDialog();
    } catch (e) {
      if (e instanceof ContractorLifecycleError) {
        setOpError(`Cannot activate: ${e.message}`);
      } else {
        setOpError(e instanceof Error ? e.message : 'Operation failed.');
      }
    }
  }

  function handleArchive(contractor: ContractorRecord, reason: string): void {
    try {
      sdk.contractors.archive(contractor.id, reason);
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Operation failed.');
    }
  }

  function handleRestore(contractor: ContractorRecord): void {
    try {
      sdk.contractors.restore(contractor.id);
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Operation failed.');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="ur-page">

      {/* ── Page header ── */}
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

      {/* ── Area ownership rule ── */}
      <div className="con-rule" role="note" aria-label={t(COPY.ruleHeading, locale)}>
        <span className="con-rule__heading">{t(COPY.ruleHeading, locale)}</span>
        <span className="con-rule__text">{t(COPY.ruleText, locale)}</span>
      </div>

      {/* ── Summary cards ── */}
      <div className="ur-summary-grid">
        <SummaryCard value={String(total)}    label={t(COPY.totalContractors, locale)} modifier="neutral" />
        <SummaryCard value={String(active)}   label={t(COPY.activeLabel,      locale)} modifier="info"    />
        <SummaryCard value={String(inactive)} label={t(COPY.inactiveLabel,    locale)} modifier="warning" />
        <SummaryCard value={String(archived)} label={t(COPY.archivedLabel,    locale)} modifier="caution" />
      </div>

      {/* ── Toolbar ── */}
      <div className="ur-toolbar">
        <button
          className="ur-btn ur-btn--primary"
          onClick={() => { setOpError(null); setDialog({ kind: 'create' }); }}
        >
          {t(COPY.createBtn, locale)}
        </button>
      </div>

      {/* ── Contractors table ── */}
      <div className="ur-table-wrap">
        <table className="ur-table">
          <thead>
            <tr>
              <th>{t(COPY.colName,    locale)}</th>
              <th>{t(COPY.colStatus,  locale)}</th>
              <th>{t(COPY.colContact, locale)}</th>
              <th>{t(COPY.colAreas,   locale)}</th>
              <th>{t(COPY.colUpdated, locale)}</th>
              <th>{t(COPY.colActions, locale)}</th>
            </tr>
          </thead>
          <tbody>
            {contractors.length === 0 ? (
              <tr>
                <td colSpan={6} className="ur-table__empty">
                  {t(COPY.noContractors, locale)}
                </td>
              </tr>
            ) : (
              contractors.map((contractor) => {
                const chip = statusChip(contractor.status);
                return (
                  <tr key={contractor.id}>

                    {/* Name + Code */}
                    <td>
                      <div className="ur-user-name">{contractor.name}</div>
                      <div className="ur-user-email">{contractor.contractorCode}</div>
                    </td>

                    {/* Status */}
                    <td>
                      <StatusChip status={chip.chipStatus} label={chip.label} />
                    </td>

                    {/* Contact */}
                    <td>
                      {contractor.contactPerson && (
                        <div className="ur-user-name">{contractor.contactPerson}</div>
                      )}
                      <div className="ur-user-email">{contractor.email}</div>
                      {contractor.phone && (
                        <div className="ur-user-email">{contractor.phone}</div>
                      )}
                    </td>

                    {/* Areas */}
                    <td>
                      <div className="ur-badge-group">
                        {contractor.areasOwned.length === 0 && (
                          <span className="ur-table__empty-cell">—</span>
                        )}
                        {contractor.areasOwned.slice(0, 3).map((area, i) => (
                          <span key={i} className="ur-badge ur-badge--sm">{area}</span>
                        ))}
                        {contractor.areasOwned.length > 3 && (
                          <span className="ur-badge ur-badge--more">+{contractor.areasOwned.length - 3}</span>
                        )}
                      </div>
                    </td>

                    {/* Last Updated */}
                    <td className="ur-table__date">{formatDate(contractor.updatedAt)}</td>

                    {/* Actions */}
                    <td>
                      <div className="ur-action-group">
                        <button
                          className="ur-btn ur-btn--ghost ur-btn--sm"
                          onClick={() => { setOpError(null); setDialog({ kind: 'edit', contractor }); }}
                        >
                          {t(COPY.actEdit, locale)}
                        </button>
                        {contractor.status === 'active' && (
                          <button
                            className="ur-btn ur-btn--ghost ur-btn--sm ur-btn--warn"
                            onClick={() => { setOpError(null); setDialog({ kind: 'deactivate', contractor }); }}
                          >
                            {t(COPY.actDeactivate, locale)}
                          </button>
                        )}
                        {contractor.status === 'inactive' && (
                          <button
                            className="ur-btn ur-btn--ghost ur-btn--sm"
                            onClick={() => { setOpError(null); setDialog({ kind: 'activate', contractor }); }}
                          >
                            {t(COPY.actActivate, locale)}
                          </button>
                        )}
                        {contractor.status !== 'archived' && (
                          <button
                            className="ur-btn ur-btn--ghost ur-btn--sm ur-btn--danger"
                            onClick={() => { setOpError(null); setDialog({ kind: 'archive', contractor }); }}
                          >
                            {t(COPY.actArchive, locale)}
                          </button>
                        )}
                        {contractor.status === 'archived' && (
                          <button
                            className="ur-btn ur-btn--ghost ur-btn--sm"
                            onClick={() => { setOpError(null); setDialog({ kind: 'restore', contractor }); }}
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

      {/* ── Dialogs ── */}

      {dialog.kind === 'create' && (
        <CreateContractorDialog
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onCreate={handleCreate}
        />
      )}

      {dialog.kind === 'edit' && (
        <EditContractorDialog
          contractor={dialog.contractor}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onEdit={handleEdit}
        />
      )}

      {dialog.kind === 'deactivate' && (
        <ReasonDialog
          title={`${t(COPY.dlgDeactivateTitle, locale)} — ${dialog.contractor.name}`}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onConfirm={(reason) => handleDeactivate(dialog.contractor, reason)}
          confirmLabel={t(COPY.actDeactivate, locale)}
          confirmClass="ur-btn--warn"
        />
      )}

      {dialog.kind === 'archive' && (
        <ReasonDialog
          title={`${t(COPY.dlgArchiveTitle, locale)} — ${dialog.contractor.name}`}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onConfirm={(reason) => handleArchive(dialog.contractor, reason)}
          confirmLabel={t(COPY.actArchive, locale)}
          confirmClass="ur-btn--danger"
        />
      )}

      {dialog.kind === 'activate' && (
        <ConfirmDialog
          title={`${t(COPY.dlgActivateTitle, locale)} — ${dialog.contractor.name}`}
          message={t(COPY.confirmActivate, locale)}
          confirmLabel={t(COPY.actActivate, locale)}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onConfirm={() => handleActivate(dialog.contractor)}
        />
      )}

      {dialog.kind === 'restore' && (
        <ConfirmDialog
          title={`${t(COPY.dlgRestoreTitle, locale)} — ${dialog.contractor.name}`}
          message={t(COPY.confirmRestore, locale)}
          confirmLabel={t(COPY.actRestore, locale)}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onConfirm={() => handleRestore(dialog.contractor)}
        />
      )}

    </div>
  );
}
