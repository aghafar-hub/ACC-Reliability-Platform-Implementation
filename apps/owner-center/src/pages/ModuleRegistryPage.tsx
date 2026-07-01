// apps/owner-center/src/pages/ModuleRegistryPage.tsx
// Module Registry — functional page backed by sdk.modules.
//
// Phase 1E: replaces the static placeholder with real data.
// No auth, no route guards, no permission filtering.
// Bilingual EN/AR with RTL support.

import React, { useState, useCallback, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePlatformSdk } from '../context/SdkContext';
import { useModuleRegistry } from '../context/ModuleRegistryContext';
import { SummaryCard } from '../components/SummaryCard';
import { StatusChip } from '../components/StatusChip';
import { BackToSettingsLink } from '../components/BackToSettingsLink';
import type { ChipStatus } from '../components/StatusChip';
import type { ModuleRecord } from '@acc-reliability/sdk';
import { ModuleLifecycleError, ModuleDuplicateError } from '@acc-reliability/sdk';

// ── Locale helpers ────────────────────────────────────────────────────────────

interface L10n { en: string; ar: string; }
function t(b: L10n, locale: string): string {
  return locale === 'ar' ? b.ar : b.en;
}

// ── Copy ──────────────────────────────────────────────────────────────────────

const COPY = {
  pageTitle:          { en: 'Module Registry',                       ar: 'سجل الوحدات'                              },
  pageDesc:           { en: 'View installed platform modules, monitor health and dependencies, control visibility, and manage maintenance windows.', ar: 'عرض وحدات المنصة المثبتة ومراقبة السلامة والتبعيات والتحكم في الظهور وإدارة نوافذ الصيانة.' },
  liveData:           { en: 'Live data',                             ar: 'بيانات حية'                                },
  totalModules:       { en: 'Total Modules',                         ar: 'إجمالي الوحدات'                           },
  enabledLabel:       { en: 'Enabled',                               ar: 'مفعّلة'                                   },
  maintenanceLabel:   { en: 'Maintenance',                           ar: 'صيانة'                                    },
  retiredLabel:       { en: 'Retired',                               ar: 'متقاعدة'                                  },
  registerBtn:        { en: '+ Register Module',                     ar: '+ تسجيل وحدة'                             },
  colName:            { en: 'Module / Key',                          ar: 'الوحدة / المفتاح'                         },
  colVersion:         { en: 'Version',                               ar: 'الإصدار'                                  },
  colStatus:          { en: 'Status',                                ar: 'الحالة'                                   },
  colHealth:          { en: 'Health',                                ar: 'الصحة'                                    },
  colCategory:        { en: 'Category',                              ar: 'الفئة'                                    },
  colDeps:            { en: 'Dependencies',                          ar: 'التبعيات'                                 },
  colUiManifest:      { en: 'UI Manifest',                           ar: 'واجهة مثبتة'                              },
  uiInstalled:        { en: 'Installed',                             ar: 'مثبتة'                                    },
  uiBackendOnly:      { en: 'Backend Only',                          ar: 'خلفية فقط'                                },
  colUpdated:         { en: 'Last Updated',                          ar: 'آخر تحديث'                                },
  colActions:         { en: 'Actions',                               ar: 'الإجراءات'                                },
  noModules:          { en: 'No modules registered yet.',            ar: 'لا توجد وحدات مسجلة بعد.'                 },
  actEdit:            { en: 'Edit',                                  ar: 'تعديل'                                    },
  actEnable:          { en: 'Enable',                                ar: 'تفعيل'                                    },
  actDisable:         { en: 'Disable',                               ar: 'تعطيل'                                    },
  actMaintOn:         { en: 'Maint. On',                             ar: 'صيانة: تشغيل'                             },
  actMaintOff:        { en: 'Maint. Off',                            ar: 'صيانة: إيقاف'                             },
  actRetire:          { en: 'Retire',                                ar: 'إيقاف نهائي'                              },
  actRestore:         { en: 'Restore',                               ar: 'استعادة'                                  },
  dlgRegisterTitle:   { en: 'Register Module',                       ar: 'تسجيل وحدة'                               },
  dlgEditTitle:       { en: 'Edit Module',                           ar: 'تعديل الوحدة'                             },
  dlgDisableTitle:    { en: 'Disable Module',                        ar: 'تعطيل الوحدة'                             },
  dlgRetireTitle:     { en: 'Retire Module',                         ar: 'إيقاف الوحدة نهائياً'                    },
  dlgEnableTitle:     { en: 'Confirm Enable',                        ar: 'تأكيد التفعيل'                            },
  dlgMaintOnTitle:    { en: 'Start Maintenance',                     ar: 'بدء الصيانة'                              },
  dlgMaintOffTitle:   { en: 'End Maintenance',                       ar: 'إنهاء الصيانة'                            },
  dlgRestoreTitle:    { en: 'Confirm Restore',                       ar: 'تأكيد الاستعادة'                          },
  fldKey:             { en: 'Module Key',                            ar: 'مفتاح الوحدة'                             },
  fldName:            { en: 'Display Name',                          ar: 'الاسم المعروض'                            },
  fldVersion:         { en: 'Version',                               ar: 'الإصدار'                                  },
  fldCategory:        { en: 'Category',                              ar: 'الفئة'                                    },
  fldDeps:            { en: 'Dependencies (comma-separated keys)',   ar: 'التبعيات (مفاتيح مفصولة بفاصلة)'         },
  fldVisibility:      { en: 'Visibility',                            ar: 'الظهور'                                   },
  fldReason:          { en: 'Reason',                                ar: 'السبب'                                    },
  visVisible:         { en: 'Visible',                               ar: 'مرئي'                                     },
  visHidden:          { en: 'Hidden',                                ar: 'مخفي'                                     },
  btnSave:            { en: 'Save',                                  ar: 'حفظ'                                      },
  btnCancel:          { en: 'Cancel',                                ar: 'إلغاء'                                    },
  btnConfirm:         { en: 'Confirm',                               ar: 'تأكيد'                                    },
  confirmEnable:      { en: 'This will set the module status to enabled.',     ar: 'سيؤدي هذا إلى تفعيل الوحدة.'   },
  confirmMaintOn:     { en: 'This will place the module into maintenance mode, blocking user access.', ar: 'سيضع هذا الوحدة في وضع الصيانة.' },
  confirmMaintOff:    { en: 'This will end maintenance mode and restore the module to enabled.',       ar: 'سينهي هذا وضع الصيانة ويعيد تفعيل الوحدة.' },
  confirmRestore:     { en: 'This will restore the retired module to enabled status.',                 ar: 'سيعيد هذا الوحدة المتقاعدة إلى الحالة المفعّلة.' },
  ruleHeading:        { en: 'Platform Delivery Rule',                ar: 'قاعدة توصيل المنصة'                       },
  ruleText:           { en: 'Modules are delivered through approved platform releases. The platform does not use a marketplace.', ar: 'يتم توصيل الوحدات عبر إصدارات المنصة المعتمدة. لا تستخدم المنصة متجراً.' },
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
    case 'enabled':     return { chipStatus: 'operational', label: 'Enabled'     };
    case 'disabled':    return { chipStatus: 'warning',     label: 'Disabled'    };
    case 'maintenance': return { chipStatus: 'maintenance', label: 'Maintenance' };
    case 'retired':     return { chipStatus: 'critical',    label: 'Retired'     };
    default:            return { chipStatus: 'draft',       label: status        };
  }
}

function healthChip(health: string): { chipStatus: ChipStatus; label: string } {
  switch (health) {
    case 'healthy':  return { chipStatus: 'operational', label: 'Healthy'  };
    case 'degraded': return { chipStatus: 'warning',     label: 'Degraded' };
    case 'offline':  return { chipStatus: 'critical',    label: 'Offline'  };
    default:         return { chipStatus: 'draft',       label: 'Unknown'  };
  }
}

// ── Dialog discriminated union ────────────────────────────────────────────────

type Dialog =
  | { kind: 'none' }
  | { kind: 'register' }
  | { kind: 'edit';      module: ModuleRecord }
  | { kind: 'disable';   module: ModuleRecord }
  | { kind: 'retire';    module: ModuleRecord }
  | { kind: 'enable';    module: ModuleRecord }
  | { kind: 'maintOn';   module: ModuleRecord }
  | { kind: 'maintOff';  module: ModuleRecord }
  | { kind: 'restore';   module: ModuleRecord };

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

// ── Register Module dialog ────────────────────────────────────────────────────

interface RegisterDialogProps {
  locale: string;
  opError: string | null;
  onClose: () => void;
  onRegister: (data: {
    moduleKey: string; name: string; version: string;
    category: string; dependencies: string; visibility: string;
  }) => void;
}
function RegisterModuleDialog({ locale, opError, onClose, onRegister }: RegisterDialogProps): React.ReactElement {
  const [moduleKey,    setModuleKey]    = useState('');
  const [name,         setName]         = useState('');
  const [version,      setVersion]      = useState('1.0.0');
  const [category,     setCategory]     = useState('');
  const [dependencies, setDependencies] = useState('');
  const [visibility,   setVisibility]   = useState('visible');

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!moduleKey.trim() || !name.trim() || !version.trim() || !category.trim()) return;
    onRegister({ moduleKey, name, version, category, dependencies, visibility });
  }

  return (
    <DialogOverlay title={t(COPY.dlgRegisterTitle, locale)} onClose={onClose}>
      <form className="ur-dialog__body" onSubmit={handleSubmit}>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldKey, locale)}</label>
          <input className="ur-form-input" value={moduleKey} onChange={(e) => setModuleKey(e.target.value.toLowerCase().replace(/\s+/g, '-'))} required autoFocus placeholder="my-module" />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldName, locale)}</label>
          <input className="ur-form-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldVersion, locale)}</label>
          <input className="ur-form-input" value={version} onChange={(e) => setVersion(e.target.value)} required />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldCategory, locale)}</label>
          <input className="ur-form-input" value={category} onChange={(e) => setCategory(e.target.value)} required placeholder="Core, Operations, Analytics…" />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldDeps, locale)}</label>
          <input className="ur-form-input" value={dependencies} onChange={(e) => setDependencies(e.target.value)} placeholder="user-management, audit-service" />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldVisibility, locale)}</label>
          <select className="ur-form-input" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="visible">{t(COPY.visVisible, locale)}</option>
            <option value="hidden">{t(COPY.visHidden, locale)}</option>
          </select>
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

// ── Edit Module dialog ────────────────────────────────────────────────────────

interface EditDialogProps {
  module: ModuleRecord;
  locale: string;
  opError: string | null;
  onClose: () => void;
  onEdit: (module: ModuleRecord, data: {
    name: string; version: string; category: string;
    dependencies: string; visibility: string;
  }) => void;
}
function EditModuleDialog({ module, locale, opError, onClose, onEdit }: EditDialogProps): React.ReactElement {
  const [name,         setName]         = useState(module.name);
  const [version,      setVersion]      = useState(module.version);
  const [category,     setCategory]     = useState(module.category);
  const [dependencies, setDependencies] = useState(module.dependencies.join(', '));
  const [visibility,   setVisibility]   = useState(module.visibility);

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    onEdit(module, { name, version, category, dependencies, visibility });
  }

  return (
    <DialogOverlay title={`${t(COPY.dlgEditTitle, locale)} — ${module.name}`} onClose={onClose}>
      <form className="ur-dialog__body" onSubmit={handleSubmit}>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldName, locale)}</label>
          <input className="ur-form-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldVersion, locale)}</label>
          <input className="ur-form-input" value={version} onChange={(e) => setVersion(e.target.value)} required />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldCategory, locale)}</label>
          <input className="ur-form-input" value={category} onChange={(e) => setCategory(e.target.value)} required />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldDeps, locale)}</label>
          <input className="ur-form-input" value={dependencies} onChange={(e) => setDependencies(e.target.value)} />
        </div>
        <div className="ur-form-field">
          <label className="ur-form-label">{t(COPY.fldVisibility, locale)}</label>
          <select className="ur-form-input" value={visibility} onChange={(e) => setVisibility(e.target.value as 'visible' | 'hidden')}>
            <option value="visible">{t(COPY.visVisible, locale)}</option>
            <option value="hidden">{t(COPY.visHidden, locale)}</option>
          </select>
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

// ── Reason dialog (Disable / Retire) ─────────────────────────────────────────

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

export default function ModuleRegistryPage(): React.ReactElement {
  const { locale } = useLanguage();
  const sdk = usePlatformSdk();
  const { allManifests } = useModuleRegistry();

  // ── State ─────────────────────────────────────────────────────────────────

  const [modules,  setModules]  = useState<ModuleRecord[]>(() =>
    sdk.modules.list().modules as ModuleRecord[],
  );
  const [dialog,   setDialog]   = useState<Dialog>({ kind: 'none' });
  const [opError,  setOpError]  = useState<string | null>(null);

  // ── Derived counts ────────────────────────────────────────────────────────

  const total       = modules.length;
  const enabled     = modules.filter((m) => m.status === 'enabled').length;
  const maintenance = modules.filter((m) => m.status === 'maintenance').length;
  const retired     = modules.filter((m) => m.status === 'retired').length;

  // ── UI manifest sync ──────────────────────────────────────────────────────
  // Set of all module keys that have a registered UI manifest (from platform-manifests.ts).
  // A module in the registry without a matching manifest is backend-only —
  // it has no sidebar entry, no route, and no UI component.
  const manifestKeySet = useMemo(
    () => new Set(allManifests.map(m => m.lifecycleKey ?? m.moduleId)),
    [allManifests],
  );

  // ── Helpers ───────────────────────────────────────────────────────────────

  const refetch = useCallback(() => {
    setModules(sdk.modules.list().modules as ModuleRecord[]);
  }, [sdk]);

  function closeDialog(): void {
    setDialog({ kind: 'none' });
    setOpError(null);
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleRegister(data: {
    moduleKey: string; name: string; version: string;
    category: string; dependencies: string; visibility: string;
  }): void {
    try {
      const deps = data.dependencies
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);

      sdk.modules.register({
        moduleKey:    data.moduleKey,
        name:         data.name,
        version:      data.version,
        category:     data.category,
        dependencies: deps,
        visibility:   data.visibility as 'visible' | 'hidden',
      });
      refetch();
      closeDialog();
    } catch (e) {
      if (e instanceof ModuleDuplicateError) {
        setOpError(`Module key '${data.moduleKey}' already exists.`);
      } else {
        setOpError(e instanceof Error ? e.message : 'Operation failed.');
      }
    }
  }

  function handleEdit(module: ModuleRecord, data: {
    name: string; version: string; category: string;
    dependencies: string; visibility: string;
  }): void {
    try {
      const deps = data.dependencies
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);

      sdk.modules.update(module.id, {
        name:         data.name,
        version:      data.version,
        category:     data.category,
        dependencies: deps,
        visibility:   data.visibility as 'visible' | 'hidden',
      });
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Operation failed.');
    }
  }

  function handleEnable(module: ModuleRecord): void {
    try {
      sdk.modules.enable(module.id);
      refetch();
      closeDialog();
    } catch (e) {
      if (e instanceof ModuleLifecycleError) {
        setOpError(`Cannot enable: ${e.message}`);
      } else {
        setOpError(e instanceof Error ? e.message : 'Operation failed.');
      }
    }
  }

  function handleDisable(module: ModuleRecord, reason: string): void {
    try {
      sdk.modules.disable(module.id, reason);
      refetch();
      closeDialog();
    } catch (e) {
      if (e instanceof ModuleLifecycleError) {
        setOpError(`Cannot disable: ${e.message}`);
      } else {
        setOpError(e instanceof Error ? e.message : 'Operation failed.');
      }
    }
  }

  function handleMaintOn(module: ModuleRecord): void {
    try {
      sdk.modules.startMaintenance(module.id);
      refetch();
      closeDialog();
    } catch (e) {
      if (e instanceof ModuleLifecycleError) {
        setOpError(`Cannot start maintenance: ${e.message}`);
      } else {
        setOpError(e instanceof Error ? e.message : 'Operation failed.');
      }
    }
  }

  function handleMaintOff(module: ModuleRecord): void {
    try {
      sdk.modules.endMaintenance(module.id);
      refetch();
      closeDialog();
    } catch (e) {
      if (e instanceof ModuleLifecycleError) {
        setOpError(`Cannot end maintenance: ${e.message}`);
      } else {
        setOpError(e instanceof Error ? e.message : 'Operation failed.');
      }
    }
  }

  function handleRetire(module: ModuleRecord, reason: string): void {
    try {
      sdk.modules.retire(module.id, reason);
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Operation failed.');
    }
  }

  function handleRestore(module: ModuleRecord): void {
    try {
      sdk.modules.restore(module.id);
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

      {/* ── Platform delivery rule ── */}
      <div className="con-rule" role="note" aria-label={t(COPY.ruleHeading, locale)}>
        <span className="con-rule__heading">{t(COPY.ruleHeading, locale)}</span>
        <span className="con-rule__text">{t(COPY.ruleText, locale)}</span>
      </div>

      {/* ── Summary cards ── */}
      <div className="ur-summary-grid">
        <SummaryCard value={String(total)}       label={t(COPY.totalModules,     locale)} modifier="neutral" />
        <SummaryCard value={String(enabled)}     label={t(COPY.enabledLabel,     locale)} modifier="info"    />
        <SummaryCard value={String(maintenance)} label={t(COPY.maintenanceLabel, locale)} modifier="warning" />
        <SummaryCard value={String(retired)}     label={t(COPY.retiredLabel,     locale)} modifier="caution" />
      </div>

      {/* ── Toolbar ── */}
      <div className="ur-toolbar">
        <button
          className="ur-btn ur-btn--primary"
          onClick={() => { setOpError(null); setDialog({ kind: 'register' }); }}
        >
          {t(COPY.registerBtn, locale)}
        </button>
      </div>

      {/* ── Modules table ── */}
      <div className="ur-table-wrap">
        <table className="ur-table">
          <thead>
            <tr>
              <th>{t(COPY.colName,      locale)}</th>
              <th>{t(COPY.colVersion,   locale)}</th>
              <th>{t(COPY.colStatus,    locale)}</th>
              <th>{t(COPY.colHealth,    locale)}</th>
              <th>{t(COPY.colUiManifest,locale)}</th>
              <th>{t(COPY.colCategory,  locale)}</th>
              <th>{t(COPY.colDeps,      locale)}</th>
              <th>{t(COPY.colUpdated,   locale)}</th>
              <th>{t(COPY.colActions,   locale)}</th>
            </tr>
          </thead>
          <tbody>
            {modules.length === 0 ? (
              <tr>
                <td colSpan={9} className="ur-table__empty">
                  {t(COPY.noModules, locale)}
                </td>
              </tr>
            ) : (
              modules.map((module) => {
                const chip   = statusChip(module.status);
                const hChip  = healthChip(module.healthStatus);
                return (
                  <tr key={module.id}>

                    {/* Name + Key */}
                    <td>
                      <div className="ur-user-name">{module.name}</div>
                      <div className="ur-user-email">{module.moduleKey}</div>
                    </td>

                    {/* Version */}
                    <td className="ur-table__date">{module.version}</td>

                    {/* Status */}
                    <td>
                      <StatusChip status={chip.chipStatus} label={chip.label} />
                    </td>

                    {/* Health */}
                    <td>
                      <StatusChip status={hChip.chipStatus} label={hChip.label} />
                    </td>

                    {/* UI Manifest — indicates whether this backend module has a UI manifest
                        installed in platform-manifests.ts (visible in sidebar / has routes).
                        "Backend Only" = registered in registry but no UI manifest. */}
                    <td>
                      {manifestKeySet.has(module.moduleKey) ? (
                        <StatusChip status="operational" label={t(COPY.uiInstalled,   locale)} />
                      ) : (
                        <StatusChip status="draft"        label={t(COPY.uiBackendOnly, locale)} />
                      )}
                    </td>

                    {/* Category */}
                    <td>
                      <span className="ur-badge ur-badge--sm">{module.category}</span>
                    </td>

                    {/* Dependencies */}
                    <td>
                      <div className="ur-badge-group">
                        {module.dependencies.length === 0 && (
                          <span className="ur-table__empty-cell">—</span>
                        )}
                        {module.dependencies.slice(0, 2).map((dep: string, i: number) => (
                          <span key={i} className="ur-badge ur-badge--sm">{dep}</span>
                        ))}
                        {module.dependencies.length > 2 && (
                          <span className="ur-badge ur-badge--more">+{module.dependencies.length - 2}</span>
                        )}
                      </div>
                    </td>

                    {/* Last Updated */}
                    <td className="ur-table__date">{formatDate(module.updatedAt)}</td>

                    {/* Actions */}
                    <td>
                      <div className="ur-action-group">
                        <button
                          className="ur-btn ur-btn--ghost ur-btn--sm"
                          onClick={() => { setOpError(null); setDialog({ kind: 'edit', module }); }}
                        >
                          {t(COPY.actEdit, locale)}
                        </button>
                        {module.status === 'disabled' && (
                          <button
                            className="ur-btn ur-btn--ghost ur-btn--sm"
                            onClick={() => { setOpError(null); setDialog({ kind: 'enable', module }); }}
                          >
                            {t(COPY.actEnable, locale)}
                          </button>
                        )}
                        {module.status === 'enabled' && (
                          <button
                            className="ur-btn ur-btn--ghost ur-btn--sm ur-btn--warn"
                            onClick={() => { setOpError(null); setDialog({ kind: 'disable', module }); }}
                          >
                            {t(COPY.actDisable, locale)}
                          </button>
                        )}
                        {module.status === 'enabled' && (
                          <button
                            className="ur-btn ur-btn--ghost ur-btn--sm ur-btn--warn"
                            onClick={() => { setOpError(null); setDialog({ kind: 'maintOn', module }); }}
                          >
                            {t(COPY.actMaintOn, locale)}
                          </button>
                        )}
                        {module.status === 'maintenance' && (
                          <button
                            className="ur-btn ur-btn--ghost ur-btn--sm"
                            onClick={() => { setOpError(null); setDialog({ kind: 'maintOff', module }); }}
                          >
                            {t(COPY.actMaintOff, locale)}
                          </button>
                        )}
                        {module.status !== 'retired' && (
                          <button
                            className="ur-btn ur-btn--ghost ur-btn--sm ur-btn--danger"
                            onClick={() => { setOpError(null); setDialog({ kind: 'retire', module }); }}
                          >
                            {t(COPY.actRetire, locale)}
                          </button>
                        )}
                        {module.status === 'retired' && (
                          <button
                            className="ur-btn ur-btn--ghost ur-btn--sm"
                            onClick={() => { setOpError(null); setDialog({ kind: 'restore', module }); }}
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

      {dialog.kind === 'register' && (
        <RegisterModuleDialog
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onRegister={handleRegister}
        />
      )}

      {dialog.kind === 'edit' && (
        <EditModuleDialog
          module={dialog.module}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onEdit={handleEdit}
        />
      )}

      {dialog.kind === 'disable' && (
        <ReasonDialog
          title={`${t(COPY.dlgDisableTitle, locale)} — ${dialog.module.name}`}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onConfirm={(reason) => handleDisable(dialog.module, reason)}
          confirmLabel={t(COPY.actDisable, locale)}
          confirmClass="ur-btn--warn"
        />
      )}

      {dialog.kind === 'retire' && (
        <ReasonDialog
          title={`${t(COPY.dlgRetireTitle, locale)} — ${dialog.module.name}`}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onConfirm={(reason) => handleRetire(dialog.module, reason)}
          confirmLabel={t(COPY.actRetire, locale)}
          confirmClass="ur-btn--danger"
        />
      )}

      {dialog.kind === 'enable' && (
        <ConfirmDialog
          title={`${t(COPY.dlgEnableTitle, locale)} — ${dialog.module.name}`}
          message={t(COPY.confirmEnable, locale)}
          confirmLabel={t(COPY.actEnable, locale)}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onConfirm={() => handleEnable(dialog.module)}
        />
      )}

      {dialog.kind === 'maintOn' && (
        <ConfirmDialog
          title={`${t(COPY.dlgMaintOnTitle, locale)} — ${dialog.module.name}`}
          message={t(COPY.confirmMaintOn, locale)}
          confirmLabel={t(COPY.actMaintOn, locale)}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onConfirm={() => handleMaintOn(dialog.module)}
          confirmClass="ur-btn--warn"
        />
      )}

      {dialog.kind === 'maintOff' && (
        <ConfirmDialog
          title={`${t(COPY.dlgMaintOffTitle, locale)} — ${dialog.module.name}`}
          message={t(COPY.confirmMaintOff, locale)}
          confirmLabel={t(COPY.actMaintOff, locale)}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onConfirm={() => handleMaintOff(dialog.module)}
        />
      )}

      {dialog.kind === 'restore' && (
        <ConfirmDialog
          title={`${t(COPY.dlgRestoreTitle, locale)} — ${dialog.module.name}`}
          message={t(COPY.confirmRestore, locale)}
          confirmLabel={t(COPY.actRestore, locale)}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onConfirm={() => handleRestore(dialog.module)}
        />
      )}

    </div>
  );
}
