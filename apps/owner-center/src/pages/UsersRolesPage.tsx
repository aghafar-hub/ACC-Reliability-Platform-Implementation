// apps/owner-center/src/pages/UsersRolesPage.tsx
// Users & Roles Center — first fully functional Owner Center page.
//
// Phase 1C: consumes the User Domain via sdk.users.
// No auth, no route guards, no permission filtering.
// Bilingual EN/AR with RTL support.

import React, { useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePlatformSdk } from '../context/SdkContext';
import { SummaryCard } from '../components/SummaryCard';
import { StatusChip } from '../components/StatusChip';
import { BackToSettingsLink } from '../components/BackToSettingsLink';
import type { ChipStatus } from '../components/StatusChip';
import type { UserRecord, ContractorId, UserRole } from '@acc-reliability/sdk';
import { UserDuplicateError, UserLifecycleError } from '@acc-reliability/sdk';

// ── Constants ─────────────────────────────────────────────────────────────────

const KNOWN_CONTRACTORS = ['ACC', 'RHI', 'ASEC'] as const;

const KNOWN_PLATFORM_ROLES: readonly string[] = [
  'platform.admin',
  'platform.viewer',
  'contractor.admin',
  'contractor.engineer',
  'contractor.technician',
  'contractor.viewer',
];

// ── Locale helpers ────────────────────────────────────────────────────────────

interface L10n { en: string; ar: string; }
function t(b: L10n, locale: string): string {
  return locale === 'ar' ? b.ar : b.en;
}

const COPY = {
  pageTitle:      { en: 'Users & Roles Center',           ar: 'مركز المستخدمين والأدوار'          },
  pageDesc:       { en: 'Manage platform users, assign roles, and configure access across contractor scopes.', ar: 'إدارة مستخدمي المنصة وتعيين الأدوار وتكوين الوصول عبر نطاقات المقاولين.' },
  liveData:       { en: 'Live data',                      ar: 'بيانات حية'                         },
  totalUsers:     { en: 'Total Users',                    ar: 'إجمالي المستخدمين'                 },
  activeUsers:    { en: 'Active',                         ar: 'نشط'                                },
  suspendedUsers: { en: 'Suspended',                      ar: 'موقوف'                              },
  archivedUsers:  { en: 'Archived',                       ar: 'مؤرشف'                              },
  createUser:     { en: '+ Create User',                  ar: '+ إنشاء مستخدم'                    },
  colName:        { en: 'Name / Email',                   ar: 'الاسم / البريد'                    },
  colStatus:      { en: 'Status',                         ar: 'الحالة'                             },
  colPrimaryRole: { en: 'Primary Role',                   ar: 'الدور الأساسي'                     },
  colRoles:       { en: 'Active Roles',                   ar: 'الأدوار النشطة'                    },
  colContractor:  { en: 'Contractor',                     ar: 'المقاول'                            },
  colUpdated:     { en: 'Last Updated',                   ar: 'آخر تحديث'                          },
  colActions:     { en: 'Actions',                        ar: 'الإجراءات'                          },
  noUsers:        { en: 'No users yet — create the first one.',  ar: 'لا يوجد مستخدمون بعد.' },
  actEdit:        { en: 'Edit',                           ar: 'تعديل'                              },
  actAssign:      { en: 'Assign Role',                    ar: 'تعيين دور'                         },
  actSuspend:     { en: 'Suspend',                        ar: 'إيقاف'                              },
  actActivate:    { en: 'Activate',                       ar: 'تفعيل'                              },
  actArchive:     { en: 'Archive',                        ar: 'أرشفة'                              },
  actRestore:     { en: 'Restore',                        ar: 'استعادة'                            },
  dlgCreateTitle: { en: 'Create User',                    ar: 'إنشاء مستخدم'                      },
  dlgEditTitle:   { en: 'Edit User',                      ar: 'تعديل المستخدم'                    },
  dlgAssignTitle: { en: 'Assign Role',                    ar: 'تعيين دور'                         },
  dlgSuspendTitle:{ en: 'Suspend User',                   ar: 'إيقاف المستخدم'                    },
  dlgArchiveTitle:{ en: 'Archive User',                   ar: 'أرشفة المستخدم'                    },
  dlgRestoreTitle:{ en: 'Confirm Restore',                ar: 'تأكيد الاستعادة'                   },
  dlgActivateTitle:{ en: 'Confirm Activate',              ar: 'تأكيد التفعيل'                      },
  fldDisplayName: { en: 'Display Name',                   ar: 'الاسم المعروض'                     },
  fldEmail:       { en: 'Email',                          ar: 'البريد الإلكتروني'                 },
  fldContractor:  { en: 'Contractor',                     ar: 'المقاول'                            },
  fldRole:        { en: 'Role',                           ar: 'الدور'                              },
  fldReason:      { en: 'Reason',                         ar: 'السبب'                              },
  btnSave:        { en: 'Save',                           ar: 'حفظ'                               },
  btnCancel:      { en: 'Cancel',                         ar: 'إلغاء'                              },
  btnConfirm:     { en: 'Confirm',                        ar: 'تأكيد'                              },
  confirmActivate:{ en: 'This will restore the user to active status.', ar: 'سيُعيد هذا المستخدم إلى الحالة النشطة.' },
  confirmRestore: { en: 'This will restore the archived user to active status.', ar: 'سيُعيد هذا المستخدم المؤرشف إلى الحالة النشطة.' },
} as const;

// ── Helper utilities ──────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatRole(role: string): string {
  const MAP: Record<string, string> = {
    'platform.admin':        'Platform Admin',
    'platform.viewer':       'Platform Viewer',
    'contractor.admin':      'Contractor Admin',
    'contractor.engineer':   'Engineer',
    'contractor.technician': 'Technician',
    'contractor.viewer':     'Viewer',
  };
  return MAP[role] ?? role;
}

function statusChip(status: string): { chipStatus: ChipStatus; label: string } {
  switch (status) {
    case 'active':    return { chipStatus: 'operational', label: 'Active'    };
    case 'suspended': return { chipStatus: 'warning',     label: 'Suspended' };
    case 'archived':  return { chipStatus: 'maintenance', label: 'Archived'  };
    default:          return { chipStatus: 'draft',        label: status      };
  }
}

// ── Dialog discriminated union ────────────────────────────────────────────────

type Dialog =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit';     user: UserRecord }
  | { kind: 'assign';   user: UserRecord }
  | { kind: 'suspend';  user: UserRecord }
  | { kind: 'archive';  user: UserRecord }
  | { kind: 'activate'; user: UserRecord }
  | { kind: 'restore';  user: UserRecord };

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

// ── Create User dialog ────────────────────────────────────────────────────────

interface CreateDialogProps {
  locale: string;
  opError: string | null;
  onClose: () => void;
  onCreate: (data: { displayName: string; email: string; contractor: string; role: string }) => void;
}
function CreateUserDialog({ locale, opError, onClose, onCreate }: CreateDialogProps): React.ReactElement {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail]             = useState('');
  const [contractor, setContractor]   = useState<string>(KNOWN_CONTRACTORS[0]);
  const [role, setRole]               = useState<string>(KNOWN_PLATFORM_ROLES[0]);

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!displayName.trim() || !email.trim()) return;
    onCreate({ displayName, email, contractor, role });
  }

  return (
    <DialogOverlay title={t(COPY.dlgCreateTitle, locale)} onClose={onClose}>
      <form className="ur-dialog__body" onSubmit={handleSubmit}>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldDisplayName, locale)}</label>
          <input
            className="ur-form-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldEmail, locale)}</label>
          <input
            className="ur-form-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldContractor, locale)}</label>
          <select
            className="ur-form-select"
            value={contractor}
            onChange={(e) => setContractor(e.target.value)}
          >
            {KNOWN_CONTRACTORS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldRole, locale)}</label>
          <select
            className="ur-form-select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {KNOWN_PLATFORM_ROLES.map((r) => (
              <option key={r} value={r}>{formatRole(r)}</option>
            ))}
          </select>
        </div>
        <InlineError message={opError} />
        <div className="ur-dialog__footer">
          <button type="button" className="ur-btn ur-btn--ghost" onClick={onClose}>
            {t(COPY.btnCancel, locale)}
          </button>
          <button type="submit" className="ur-btn ur-btn--primary">
            {t(COPY.btnSave, locale)}
          </button>
        </div>
      </form>
    </DialogOverlay>
  );
}

// ── Edit User dialog ──────────────────────────────────────────────────────────

interface EditDialogProps {
  user: UserRecord;
  locale: string;
  opError: string | null;
  onClose: () => void;
  onEdit: (user: UserRecord, data: { displayName: string; email: string }) => void;
}
function EditUserDialog({ user, locale, opError, onClose, onEdit }: EditDialogProps): React.ReactElement {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [email, setEmail]             = useState(user.email);

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    onEdit(user, { displayName, email });
  }

  return (
    <DialogOverlay title={t(COPY.dlgEditTitle, locale)} onClose={onClose}>
      <form className="ur-dialog__body" onSubmit={handleSubmit}>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldDisplayName, locale)}</label>
          <input
            className="ur-form-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldEmail, locale)}</label>
          <input
            className="ur-form-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <InlineError message={opError} />
        <div className="ur-dialog__footer">
          <button type="button" className="ur-btn ur-btn--ghost" onClick={onClose}>
            {t(COPY.btnCancel, locale)}
          </button>
          <button type="submit" className="ur-btn ur-btn--primary">
            {t(COPY.btnSave, locale)}
          </button>
        </div>
      </form>
    </DialogOverlay>
  );
}

// ── Assign Role dialog ────────────────────────────────────────────────────────

interface AssignRoleDialogProps {
  user: UserRecord;
  locale: string;
  opError: string | null;
  onClose: () => void;
  onAssign: (user: UserRecord, role: string) => void;
}
function AssignRoleDialog({ user, locale, opError, onClose, onAssign }: AssignRoleDialogProps): React.ReactElement {
  const [role, setRole] = useState<string>(KNOWN_PLATFORM_ROLES[0]);

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    onAssign(user, role);
  }

  return (
    <DialogOverlay title={`${t(COPY.dlgAssignTitle, locale)} — ${user.displayName}`} onClose={onClose}>
      <form className="ur-dialog__body" onSubmit={handleSubmit}>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldRole, locale)}</label>
          <select
            className="ur-form-select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            autoFocus
          >
            {KNOWN_PLATFORM_ROLES.map((r) => (
              <option key={r} value={r}>{formatRole(r)}</option>
            ))}
          </select>
        </div>
        <InlineError message={opError} />
        <div className="ur-dialog__footer">
          <button type="button" className="ur-btn ur-btn--ghost" onClick={onClose}>
            {t(COPY.btnCancel, locale)}
          </button>
          <button type="submit" className="ur-btn ur-btn--primary">
            {t(COPY.btnSave, locale)}
          </button>
        </div>
      </form>
    </DialogOverlay>
  );
}

// ── Suspend dialog ────────────────────────────────────────────────────────────

interface SuspendDialogProps {
  user: UserRecord;
  locale: string;
  opError: string | null;
  onClose: () => void;
  onSuspend: (user: UserRecord, reason: string) => void;
}
function SuspendDialog({ user, locale, opError, onClose, onSuspend }: SuspendDialogProps): React.ReactElement {
  const [reason, setReason] = useState('');

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!reason.trim()) return;
    onSuspend(user, reason.trim());
  }

  return (
    <DialogOverlay title={`${t(COPY.dlgSuspendTitle, locale)} — ${user.displayName}`} onClose={onClose}>
      <form className="ur-dialog__body" onSubmit={handleSubmit}>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldReason, locale)}</label>
          <input
            className="ur-form-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            autoFocus
          />
        </div>
        <InlineError message={opError} />
        <div className="ur-dialog__footer">
          <button type="button" className="ur-btn ur-btn--ghost" onClick={onClose}>
            {t(COPY.btnCancel, locale)}
          </button>
          <button type="submit" className="ur-btn ur-btn--warn">
            {t(COPY.actSuspend, locale)}
          </button>
        </div>
      </form>
    </DialogOverlay>
  );
}

// ── Archive dialog ────────────────────────────────────────────────────────────

interface ArchiveDialogProps {
  user: UserRecord;
  locale: string;
  opError: string | null;
  onClose: () => void;
  onArchive: (user: UserRecord, reason: string) => void;
}
function ArchiveDialog({ user, locale, opError, onClose, onArchive }: ArchiveDialogProps): React.ReactElement {
  const [reason, setReason] = useState('');

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!reason.trim()) return;
    onArchive(user, reason.trim());
  }

  return (
    <DialogOverlay title={`${t(COPY.dlgArchiveTitle, locale)} — ${user.displayName}`} onClose={onClose}>
      <form className="ur-dialog__body" onSubmit={handleSubmit}>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldReason, locale)}</label>
          <input
            className="ur-form-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            autoFocus
          />
        </div>
        <InlineError message={opError} />
        <div className="ur-dialog__footer">
          <button type="button" className="ur-btn ur-btn--ghost" onClick={onClose}>
            {t(COPY.btnCancel, locale)}
          </button>
          <button type="submit" className="ur-btn ur-btn--danger">
            {t(COPY.actArchive, locale)}
          </button>
        </div>
      </form>
    </DialogOverlay>
  );
}

// ── Confirm dialog (activate / restore) ───────────────────────────────────────

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
        <p className="ur-dialog__message">{message}</p>
        <InlineError message={opError} />
        <div className="ur-dialog__footer">
          <button type="button" className="ur-btn ur-btn--ghost" onClick={onClose}>
            {t(COPY.btnCancel, locale)}
          </button>
          <button type="button" className="ur-btn ur-btn--primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </DialogOverlay>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UsersRolesPage(): React.ReactElement {
  const { locale } = useLanguage();
  const sdk         = usePlatformSdk();

  // Synchronous initial load (SDK is in-memory, no async needed)
  const [users, setUsers] = useState<readonly UserRecord[]>(
    () => sdk.users.list({ limit: 500 }).users,
  );
  const [dialog, setDialog]   = useState<Dialog>({ kind: 'none' });
  const [opError, setOpError] = useState<string | null>(null);

  const refetch = useCallback((): void => {
    setUsers(sdk.users.list({ limit: 500 }).users);
  }, [sdk]);

  const closeDialog = useCallback((): void => {
    setDialog({ kind: 'none' });
    setOpError(null);
  }, []);

  // ── Counts for summary cards ──────────────────────────────────────────────

  const total     = users.length;
  const active    = users.filter((u) => u.status === 'active').length;
  const suspended = users.filter((u) => u.status === 'suspended').length;
  const archived  = users.filter((u) => u.status === 'archived').length;

  // ── Mutation handlers ─────────────────────────────────────────────────────

  function handleCreate(data: { displayName: string; email: string; contractor: string; role: string }): void {
    try {
      sdk.users.create({
        contractorId: data.contractor.trim().toUpperCase() as ContractorId,
        email:        data.email.trim(),
        displayName:  data.displayName.trim(),
        roles:        data.role ? [data.role as UserRole] : [],
      });
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(
        e instanceof UserDuplicateError
          ? 'Email already registered in this contractor scope.'
          : e instanceof Error ? e.message : 'Operation failed.',
      );
    }
  }

  function handleEdit(user: UserRecord, data: { displayName: string; email: string }): void {
    try {
      sdk.users.update(user.userId, {
        displayName: data.displayName.trim() || undefined,
        email:       data.email.trim()       || undefined,
      });
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Operation failed.');
    }
  }

  function handleAssignRole(user: UserRecord, role: string): void {
    try {
      sdk.users.assignRole(user.userId, { role: role as UserRole });
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(
        e instanceof UserLifecycleError
          ? 'Cannot assign roles to an archived user.'
          : e instanceof Error ? e.message : 'Operation failed.',
      );
    }
  }

  function handleSuspend(user: UserRecord, reason: string): void {
    try {
      sdk.users.suspend(user.userId, reason);
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Operation failed.');
    }
  }

  function handleActivate(user: UserRecord): void {
    try {
      sdk.users.activate(user.userId);
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Operation failed.');
    }
  }

  function handleArchive(user: UserRecord, reason: string): void {
    try {
      sdk.users.archive(user.userId, reason);
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Operation failed.');
    }
  }

  function handleRestore(user: UserRecord): void {
    try {
      sdk.users.restore(user.userId);
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Operation failed.');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="ur-page">

      <BackToSettingsLink />

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

      {/* ── Summary cards ── */}
      <div className="ur-summary-grid">
        <SummaryCard value={String(total)}     label={t(COPY.totalUsers,     locale)} modifier="neutral" />
        <SummaryCard value={String(active)}    label={t(COPY.activeUsers,    locale)} modifier="info"    />
        <SummaryCard value={String(suspended)} label={t(COPY.suspendedUsers, locale)} modifier="warning" />
        <SummaryCard value={String(archived)}  label={t(COPY.archivedUsers,  locale)} modifier="caution" />
      </div>

      {/* ── Toolbar ── */}
      <div className="ur-toolbar">
        <button
          className="ur-btn ur-btn--primary"
          onClick={() => { setOpError(null); setDialog({ kind: 'create' }); }}
        >
          {t(COPY.createUser, locale)}
        </button>
      </div>

      {/* ── Users table ── */}
      <div className="ur-table-wrap">
        <table className="ur-table">
          <thead>
            <tr>
              <th>{t(COPY.colName,        locale)}</th>
              <th>{t(COPY.colStatus,      locale)}</th>
              <th>{t(COPY.colPrimaryRole, locale)}</th>
              <th>{t(COPY.colRoles,       locale)}</th>
              <th>{t(COPY.colContractor,  locale)}</th>
              <th>{t(COPY.colUpdated,     locale)}</th>
              <th>{t(COPY.colActions,     locale)}</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="ur-table__empty">
                  {t(COPY.noUsers, locale)}
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const primaryRole = user.roles[0]?.role;
                const chip = statusChip(user.status);
                return (
                  <tr key={String(user.userId)}>

                    {/* Name + Email */}
                    <td>
                      <div className="ur-user-name">{user.displayName}</div>
                      <div className="ur-user-email">{user.email}</div>
                    </td>

                    {/* Status */}
                    <td>
                      <StatusChip status={chip.chipStatus} label={chip.label} />
                    </td>

                    {/* Primary Role */}
                    <td>
                      {primaryRole
                        ? <span className="ur-badge">{formatRole(primaryRole)}</span>
                        : <span className="ur-table__empty-cell">—</span>}
                    </td>

                    {/* All Active Roles */}
                    <td>
                      <div className="ur-badge-group">
                        {user.roles.length === 0 && <span className="ur-table__empty-cell">—</span>}
                        {user.roles.slice(0, 3).map((ra, i) => (
                          <span key={i} className="ur-badge ur-badge--sm">
                            {formatRole(ra.role)}
                          </span>
                        ))}
                        {user.roles.length > 3 && (
                          <span className="ur-badge ur-badge--more">+{user.roles.length - 3}</span>
                        )}
                      </div>
                    </td>

                    {/* Contractor */}
                    <td className="ur-table__contractor">{String(user.contractorId)}</td>

                    {/* Last Updated */}
                    <td className="ur-table__date">{formatDate(user.updatedAt)}</td>

                    {/* Actions */}
                    <td>
                      <div className="ur-action-group">
                        <button
                          className="ur-btn ur-btn--ghost ur-btn--sm"
                          onClick={() => { setOpError(null); setDialog({ kind: 'edit', user }); }}
                        >
                          {t(COPY.actEdit, locale)}
                        </button>
                        <button
                          className="ur-btn ur-btn--ghost ur-btn--sm"
                          disabled={user.status === 'archived'}
                          onClick={() => { setOpError(null); setDialog({ kind: 'assign', user }); }}
                        >
                          {t(COPY.actAssign, locale)}
                        </button>
                        {user.status === 'active' && (
                          <button
                            className="ur-btn ur-btn--ghost ur-btn--sm ur-btn--warn"
                            onClick={() => { setOpError(null); setDialog({ kind: 'suspend', user }); }}
                          >
                            {t(COPY.actSuspend, locale)}
                          </button>
                        )}
                        {user.status === 'suspended' && (
                          <button
                            className="ur-btn ur-btn--ghost ur-btn--sm"
                            onClick={() => { setOpError(null); setDialog({ kind: 'activate', user }); }}
                          >
                            {t(COPY.actActivate, locale)}
                          </button>
                        )}
                        {user.status !== 'archived' && (
                          <button
                            className="ur-btn ur-btn--ghost ur-btn--sm ur-btn--danger"
                            onClick={() => { setOpError(null); setDialog({ kind: 'archive', user }); }}
                          >
                            {t(COPY.actArchive, locale)}
                          </button>
                        )}
                        {user.status === 'archived' && (
                          <button
                            className="ur-btn ur-btn--ghost ur-btn--sm"
                            onClick={() => { setOpError(null); setDialog({ kind: 'restore', user }); }}
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
        <CreateUserDialog
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onCreate={handleCreate}
        />
      )}

      {dialog.kind === 'edit' && (
        <EditUserDialog
          user={dialog.user}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onEdit={handleEdit}
        />
      )}

      {dialog.kind === 'assign' && (
        <AssignRoleDialog
          user={dialog.user}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onAssign={handleAssignRole}
        />
      )}

      {dialog.kind === 'suspend' && (
        <SuspendDialog
          user={dialog.user}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onSuspend={handleSuspend}
        />
      )}

      {dialog.kind === 'archive' && (
        <ArchiveDialog
          user={dialog.user}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onArchive={handleArchive}
        />
      )}

      {dialog.kind === 'activate' && (
        <ConfirmDialog
          title={`${t(COPY.dlgActivateTitle, locale)} — ${dialog.user.displayName}`}
          message={t(COPY.confirmActivate, locale)}
          confirmLabel={t(COPY.actActivate, locale)}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onConfirm={() => handleActivate(dialog.user)}
        />
      )}

      {dialog.kind === 'restore' && (
        <ConfirmDialog
          title={`${t(COPY.dlgRestoreTitle, locale)} — ${dialog.user.displayName}`}
          message={t(COPY.confirmRestore, locale)}
          confirmLabel={t(COPY.actRestore, locale)}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onConfirm={() => handleRestore(dialog.user)}
        />
      )}

    </div>
  );
}
