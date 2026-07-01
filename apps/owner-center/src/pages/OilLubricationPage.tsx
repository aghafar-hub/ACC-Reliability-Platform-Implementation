// apps/owner-center/src/pages/OilLubricationPage.tsx
// Oil Lubrication Module — v2 Sprint 02
//
// Sprint 01: Module foundation and dashboard.
// Sprint 02: Lubrication Point Explorer (search, filters, table, CRUD dialogs).
//
// Internal sub-routing handles all module nav paths.
// All copy is bilingual (EN/AR).

import React, { useState, useCallback, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { StatusChip } from '../components/StatusChip';
import { SummaryCard } from '../components/SummaryCard';
import type { ChipStatus } from '../components/StatusChip';
import {
  lubricationPointService,
  computeLpStatus,
} from '../modules/oil-lubrication/lubrication-point.service';
import type {
  LpExplorerRow,
  LpStatus,
  LpCreateInput,
} from '../modules/oil-lubrication/lubrication-point.service';

// ── Locale helpers ─────────────────────────────────────────────────────────────

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

// ── Types ──────────────────────────────────────────────────────────────────────

type KpiVariant = 'operational' | 'warning' | 'critical' | 'maintenance';

interface OilKpiCard {
  readonly label:   L10n<string>;
  readonly value:   L10n<string>;
  readonly subtext: L10n<string>;
  readonly variant: KpiVariant;
}

// ── Static copy ────────────────────────────────────────────────────────────────

const COPY = {
  // Module
  moduleTitle:  { en: 'Oil Lubrication',                                         ar: 'تشحيم الزيت'                              },
  moduleDesc:   { en: 'Oil change management and lubrication point tracking.',    ar: 'إدارة تغيير الزيت وتتبع نقاط التشحيم.'   },
  statusReady:  { en: 'Module Ready',                                             ar: 'الوحدة جاهزة'                             },

  // Dashboard sections
  secSummary:   { en: 'Summary',                       ar: 'الملخص'                                   },
  secChanges:   { en: 'Recent Oil Changes',            ar: 'تغييرات الزيت الأخيرة'                    },
  secTasks:     { en: 'Upcoming Lubrication Tasks',    ar: 'مهام التشحيم القادمة'                      },
  secRoutes:    { en: 'Route Status',                  ar: 'حالة المسارات'                            },
  secAlerts:    { en: 'Alerts',                        ar: 'التنبيهات'                                },
  noChanges:    { en: 'No oil changes recorded yet.',  ar: 'لم يتم تسجيل تغييرات زيت بعد.'            },
  noTasks:      { en: 'No upcoming tasks scheduled.',  ar: 'لا توجد مهام قادمة مجدولة.'               },
  noRoutes:     { en: 'No active routes configured.',  ar: 'لا توجد مسارات نشطة مهيأة.'               },
  noAlerts:     { en: 'No active alerts.',             ar: 'لا توجد تنبيهات نشطة.'                    },
  alertsClear:  { en: 'Clear',                         ar: 'صافٍ'                                     },
  comingSoon:   { en: 'Available in a future sprint',  ar: 'متاح في sprint قادم'                      },

  // Sub-page labels
  oilChangeTitle:  { en: 'Oil Change',      ar: 'تغيير الزيت'    },
  oilChangeDesc:   { en: 'Record and manage oil change work orders, service intervals, and completion tracking.', ar: 'تسجيل وإدارة أوامر عمل تغيير الزيت وفترات الخدمة وتتبع الإنجاز.' },
  samplingTitle:   { en: 'Sampling',        ar: 'أخذ العينات'    },
  samplingDesc:    { en: 'Log oil sample submissions, track laboratory results, and flag anomalies.', ar: 'تسجيل عينات الزيت وتتبع النتائج المختبرية وتحديد الشذوذات.' },
  routesTitle:     { en: 'Routes',          ar: 'المسارات'       },
  routesDesc:      { en: 'Define and manage lubrication technician routes and point assignments.', ar: 'تحديد وإدارة مسارات الفنيين ونقاط التشحيم.' },
  forecastTitle:   { en: 'Forecast',        ar: 'التوقعات'       },
  forecastDesc:    { en: 'AI-assisted consumption forecasting, due-date prediction, and reorder planning.', ar: 'توقعات الاستهلاك بمساعدة الذكاء الاصطناعي وتنبؤات المواعيد وتخطيط إعادة الطلب.' },
  reportsTitle:    { en: 'Reports',         ar: 'التقارير'       },
  reportsDesc:     { en: 'Generate compliance, consumption, and performance reports for oil lubrication operations.', ar: 'إنشاء تقارير الامتثال والاستهلاك والأداء لعمليات تشحيم الزيت.' },
  settingsTitle:   { en: 'Module Settings', ar: 'إعدادات الوحدة' },
  settingsDesc:    { en: 'Configure service intervals, approval workflows, and alert thresholds.', ar: 'ضبط فترات الصيانة وسير الموافقة وحدود التنبيه.' },

  // Explorer
  explorerTitle:   { en: 'Lubrication Points',           ar: 'نقاط التشحيم'                          },
  explorerDesc:    { en: 'Manage registered lubrication points across all equipment and areas.', ar: 'إدارة نقاط التشحيم المسجلة عبر جميع المعدات والمناطق.' },
  explorerLive:    { en: 'Live data',                    ar: 'بيانات حية'                             },
  addBtn:          { en: '+ Add Lubrication Point',      ar: '+ إضافة نقطة تشحيم'                     },

  // Summary cards
  sumTotal:        { en: 'Total',      ar: 'الإجمالي'      },
  sumActive:       { en: 'Active',     ar: 'نشط'           },
  sumOverdue:      { en: 'Overdue',    ar: 'متأخر'         },
  sumDueSoon:      { en: 'Due Soon',   ar: 'مستحق قريباً'  },

  // Filters
  searchPlaceholder: { en: 'Search by name, equipment ID or LP code…', ar: 'ابحث بالاسم أو معرّف المعدة أو رمز النقطة…' },
  filterArea:        { en: 'All Areas',        ar: 'جميع المناطق'   },
  filterContractor:  { en: 'All Contractors',  ar: 'جميع المقاولين' },
  filterEquipment:   { en: 'All Equipment',    ar: 'جميع المعدات'   },
  filterOilType:     { en: 'All Oil Types',    ar: 'جميع أنواع الزيت' },
  filterStatus:      { en: 'All Statuses',     ar: 'جميع الحالات'   },

  // Table columns
  colLpCode:     { en: 'LP Code',        ar: 'رمز النقطة'         },
  colEquipment:  { en: 'Equipment ID',   ar: 'معرّف المعدة'        },
  colName:       { en: 'Name',           ar: 'الاسم'              },
  colArea:       { en: 'Area',           ar: 'المنطقة'            },
  colContractor: { en: 'Contractor',     ar: 'المقاول'            },
  colOilType:    { en: 'Oil Type',       ar: 'نوع الزيت'          },
  colFrequency:  { en: 'Frequency',      ar: 'الترددية'           },
  colLastChange: { en: 'Last Changed',   ar: 'آخر تغيير'          },
  colNextDue:    { en: 'Next Due',       ar: 'الموعد القادم'      },
  colStatus:     { en: 'Status',         ar: 'الحالة'             },
  colActions:    { en: 'Actions',        ar: 'الإجراءات'          },

  // Status labels
  statusActive:   { en: 'Active',    ar: 'نشط'           },
  statusOverdue:  { en: 'Overdue',   ar: 'متأخر'         },
  statusDueSoon:  { en: 'Due Soon',  ar: 'مستحق قريباً'  },
  statusInactive: { en: 'Inactive',  ar: 'غير نشط'       },

  // Frequency
  freqDays:  { en: 'days',  ar: 'يوم' },

  // Empty / none
  noDueDate:  { en: '—',              ar: '—'                    },
  noPoints:   { en: 'No lubrication points found. Adjust filters or add the first point.', ar: 'لم يتم العثور على نقاط تشحيم. عدّل المرشحات أو أضف أول نقطة.' },

  // Dialogs
  dlgAddTitle:        { en: 'Add Lubrication Point',   ar: 'إضافة نقطة تشحيم'       },
  dlgEditTitle:       { en: 'Edit Lubrication Point',  ar: 'تعديل نقطة التشحيم'     },
  dlgDeactivateTitle: { en: 'Deactivate Point',        ar: 'إلغاء تفعيل النقطة'     },
  dlgDeactivateMsg:   { en: 'This will mark the lubrication point as inactive. Historical records are preserved.', ar: 'سيُعلَّم هذا على أنه غير نشط. السجلات التاريخية محفوظة.' },

  // Form fields
  fldLpCode:      { en: 'LP Code (e.g. LP-011)',     ar: 'رمز النقطة (مثال: LP-011)'  },
  fldEquipmentId: { en: 'Equipment ID',              ar: 'معرّف المعدة'               },
  fldContractor:  { en: 'Contractor Code',           ar: 'رمز المقاول'               },
  fldName:        { en: 'Point Name',                ar: 'اسم النقطة'                },
  fldArea:        { en: 'Area',                      ar: 'المنطقة'                   },
  fldOilType:     { en: 'Oil Type / Grade',          ar: 'نوع الزيت / الدرجة'        },
  fldFrequency:   { en: 'Frequency (days)',          ar: 'الترددية (أيام)'           },
  fldLastChange:  { en: 'Last Change Date',          ar: 'تاريخ آخر تغيير'           },
  fldNextDue:     { en: 'Next Due Date',             ar: 'تاريخ الاستحقاق'           },

  btnSave:     { en: 'Save',       ar: 'حفظ'     },
  btnCancel:   { en: 'Cancel',     ar: 'إلغاء'   },
  btnConfirm:  { en: 'Confirm',    ar: 'تأكيد'   },
  btnEdit:     { en: 'Edit',       ar: 'تعديل'   },
  btnDeact:    { en: 'Deactivate', ar: 'إلغاء التفعيل' },
} as const;

// ── KPI card data ──────────────────────────────────────────────────────────────

const KPI_CARDS: readonly OilKpiCard[] = [
  {
    label:   { en: 'Total Lubrication Points',   ar: 'إجمالي نقاط التشحيم'     },
    value:   { en: '0',                          ar: '٠'                        },
    subtext: { en: 'None configured',            ar: 'لم يتم الضبط بعد'        },
    variant: 'operational',
  },
  {
    label:   { en: 'Due Soon',                   ar: 'مستحق قريباً'            },
    value:   { en: '0',                          ar: '٠'                        },
    subtext: { en: 'Within 7 days',              ar: 'خلال 7 أيام'              },
    variant: 'warning',
  },
  {
    label:   { en: 'Overdue',                    ar: 'متأخر'                   },
    value:   { en: '0',                          ar: '٠'                        },
    subtext: { en: 'Past due date',              ar: 'تجاوز الموعد المحدد'     },
    variant: 'critical',
  },
  {
    label:   { en: 'Pending Approvals',          ar: 'الموافقات المعلقة'       },
    value:   { en: '0',                          ar: '٠'                        },
    subtext: { en: 'Awaiting review',            ar: 'في انتظار المراجعة'      },
    variant: 'warning',
  },
  {
    label:   { en: 'Active Routes',              ar: 'المسارات النشطة'         },
    value:   { en: '0',                          ar: '٠'                        },
    subtext: { en: 'No routes configured',       ar: 'لا توجد مسارات مهيأة'   },
    variant: 'maintenance',
  },
  {
    label:   { en: 'Oil Consumption This Month', ar: 'استهلاك الزيت هذا الشهر' },
    value:   { en: '0 L',                        ar: '٠ ل'                      },
    subtext: { en: 'No records yet',             ar: 'لا توجد سجلات بعد'       },
    variant: 'operational',
  },
];

// ── Dashboard sub-components ───────────────────────────────────────────────────

function DashboardSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="dashboard-section">
      <h2 className="dashboard-section__title">{heading}</h2>
      {children}
    </section>
  );
}

function StatusDot({ variant }: { variant: KpiVariant }): React.ReactElement {
  return <span className={`db-status-dot db-status-dot--${variant}`} aria-hidden="true" />;
}

function OilKpiCardItem({ card, locale }: { card: OilKpiCard; locale: string }): React.ReactElement {
  return (
    <div className={`db-kpi-card db-kpi-card--${card.variant}`}>
      <span className="db-kpi-card__label">{t(card.label, locale)}</span>
      <span className="db-kpi-card__value">{t(card.value, locale)}</span>
      <div className="db-kpi-card__status">
        <StatusDot variant={card.variant} />
        <span>{t(card.subtext, locale)}</span>
      </div>
    </div>
  );
}

function EmptyPanel({ message }: { message: string }): React.ReactElement {
  return <p className="db-panel__empty">{message}</p>;
}

// ── Explorer helpers ───────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function lpStatusChip(status: LpStatus): { chipStatus: ChipStatus; label: L10n<string> } {
  switch (status) {
    case 'active':    return { chipStatus: 'operational', label: COPY.statusActive   };
    case 'overdue':   return { chipStatus: 'critical',    label: COPY.statusOverdue  };
    case 'due-soon':  return { chipStatus: 'warning',     label: COPY.statusDueSoon  };
    case 'inactive':  return { chipStatus: 'draft',       label: COPY.statusInactive };
  }
}

function distinct(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

// ── Dialog sub-components ─────────────────────────────────────────────────────

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

// ── Add LP dialog ──────────────────────────────────────────────────────────────

interface AddLpDialogProps {
  locale: string;
  opError: string | null;
  onClose: () => void;
  onAdd: (input: LpCreateInput) => void;
}
function AddLpDialog({ locale, opError, onClose, onAdd }: AddLpDialogProps): React.ReactElement {
  const [lpCode,      setLpCode]      = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [contractor,  setContractor]  = useState('');
  const [name,        setName]        = useState('');
  const [area,        setArea]        = useState('');
  const [oilType,     setOilType]     = useState('');
  const [freqDays,    setFreqDays]    = useState('90');
  const [lastChange,  setLastChange]  = useState('');
  const [nextDue,     setNextDue]     = useState('');

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!lpCode.trim() || !equipmentId.trim() || !contractor.trim() || !name.trim() || !area.trim() || !oilType.trim()) return;
    const freq = parseInt(freqDays, 10);
    onAdd({
      lubricationPointId: lpCode.trim().toUpperCase(),
      equipmentId:        equipmentId.trim().toUpperCase(),
      contractorId:       contractor.trim().toUpperCase(),
      name:               name.trim(),
      area:               area.trim(),
      oilType:            oilType.trim(),
      frequencyDays:      isNaN(freq) || freq <= 0 ? 90 : freq,
      lastChangeDate:     lastChange.trim() || null,
      nextDueDate:        nextDue.trim() || null,
    });
  }

  const l = (b: L10n<string>) => t(b, locale);

  return (
    <DialogOverlay title={l(COPY.dlgAddTitle)} onClose={onClose}>
      <form className="ur-dialog__body" onSubmit={handleSubmit}>
        <div className="ol-form-grid">
          <div className="ur-form-field">
            <label className="ur-form-label">{l(COPY.fldLpCode)}</label>
            <input className="ur-form-input" value={lpCode} onChange={(e) => setLpCode(e.target.value)} required autoFocus placeholder="LP-011" />
          </div>
          <div className="ur-form-field">
            <label className="ur-form-label">{l(COPY.fldEquipmentId)}</label>
            <input className="ur-form-input" value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)} required placeholder="EQ-PUMP-X01" />
          </div>
          <div className="ur-form-field">
            <label className="ur-form-label">{l(COPY.fldContractor)}</label>
            <input className="ur-form-input" value={contractor} onChange={(e) => setContractor(e.target.value)} required placeholder="ACC" />
          </div>
          <div className="ur-form-field">
            <label className="ur-form-label">{l(COPY.fldName)}</label>
            <input className="ur-form-input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Main Bearing" />
          </div>
          <div className="ur-form-field">
            <label className="ur-form-label">{l(COPY.fldArea)}</label>
            <input className="ur-form-input" value={area} onChange={(e) => setArea(e.target.value)} required placeholder="Area-01" />
          </div>
          <div className="ur-form-field">
            <label className="ur-form-label">{l(COPY.fldOilType)}</label>
            <input className="ur-form-input" value={oilType} onChange={(e) => setOilType(e.target.value)} required placeholder="ISO VG 46" />
          </div>
          <div className="ur-form-field">
            <label className="ur-form-label">{l(COPY.fldFrequency)}</label>
            <input className="ur-form-input" type="number" min="1" value={freqDays} onChange={(e) => setFreqDays(e.target.value)} required />
          </div>
          <div className="ur-form-field">
            <label className="ur-form-label">{l(COPY.fldLastChange)}</label>
            <input className="ur-form-input" type="date" value={lastChange} onChange={(e) => setLastChange(e.target.value)} />
          </div>
          <div className="ur-form-field">
            <label className="ur-form-label">{l(COPY.fldNextDue)}</label>
            <input className="ur-form-input" type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
          </div>
        </div>
        <InlineError message={opError} />
        <div className="ur-dialog__footer">
          <button type="button" className="ur-btn ur-btn--ghost" onClick={onClose}>{l(COPY.btnCancel)}</button>
          <button type="submit" className="ur-btn ur-btn--primary">{l(COPY.btnSave)}</button>
        </div>
      </form>
    </DialogOverlay>
  );
}

// ── Edit LP dialog ─────────────────────────────────────────────────────────────

interface EditLpDialogProps {
  row: LpExplorerRow;
  locale: string;
  opError: string | null;
  onClose: () => void;
  onEdit: (id: string, input: Partial<{ name: string; area: string; oilType: string; frequencyDays: number; lastChangeDate: string | null; nextDueDate: string | null; }>) => void;
}
function EditLpDialog({ row, locale, opError, onClose, onEdit }: EditLpDialogProps): React.ReactElement {
  const [name,       setName]       = useState(row.name);
  const [area,       setArea]       = useState(row.area);
  const [oilType,    setOilType]    = useState(row.oilType);
  const [freqDays,   setFreqDays]   = useState(String(row.frequencyDays));
  const [lastChange, setLastChange] = useState(row.lastChangeDate ?? '');
  const [nextDue,    setNextDue]    = useState(row.nextDueDate ?? '');

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const freq = parseInt(freqDays, 10);
    onEdit(row.id, {
      name:           name.trim(),
      area:           area.trim(),
      oilType:        oilType.trim(),
      frequencyDays:  isNaN(freq) || freq <= 0 ? row.frequencyDays : freq,
      lastChangeDate: lastChange.trim() || null,
      nextDueDate:    nextDue.trim() || null,
    });
  }

  const l = (b: L10n<string>) => t(b, locale);

  return (
    <DialogOverlay title={`${l(COPY.dlgEditTitle)} — ${row.lubricationPointId}`} onClose={onClose}>
      <form className="ur-dialog__body" onSubmit={handleSubmit}>
        <div className="ol-form-grid">
          <div className="ur-form-field">
            <label className="ur-form-label">{l(COPY.fldName)}</label>
            <input className="ur-form-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>
          <div className="ur-form-field">
            <label className="ur-form-label">{l(COPY.fldArea)}</label>
            <input className="ur-form-input" value={area} onChange={(e) => setArea(e.target.value)} required />
          </div>
          <div className="ur-form-field">
            <label className="ur-form-label">{l(COPY.fldOilType)}</label>
            <input className="ur-form-input" value={oilType} onChange={(e) => setOilType(e.target.value)} required />
          </div>
          <div className="ur-form-field">
            <label className="ur-form-label">{l(COPY.fldFrequency)}</label>
            <input className="ur-form-input" type="number" min="1" value={freqDays} onChange={(e) => setFreqDays(e.target.value)} required />
          </div>
          <div className="ur-form-field">
            <label className="ur-form-label">{l(COPY.fldLastChange)}</label>
            <input className="ur-form-input" type="date" value={lastChange} onChange={(e) => setLastChange(e.target.value)} />
          </div>
          <div className="ur-form-field">
            <label className="ur-form-label">{l(COPY.fldNextDue)}</label>
            <input className="ur-form-input" type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
          </div>
        </div>
        <InlineError message={opError} />
        <div className="ur-dialog__footer">
          <button type="button" className="ur-btn ur-btn--ghost" onClick={onClose}>{l(COPY.btnCancel)}</button>
          <button type="submit" className="ur-btn ur-btn--primary">{l(COPY.btnSave)}</button>
        </div>
      </form>
    </DialogOverlay>
  );
}

// ── Confirm dialog ─────────────────────────────────────────────────────────────

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
  const l = (b: L10n<string>) => t(b, locale);
  return (
    <DialogOverlay title={title} onClose={onClose}>
      <div className="ur-dialog__body">
        <p>{message}</p>
        <InlineError message={opError} />
        <div className="ur-dialog__footer">
          <button type="button" className="ur-btn ur-btn--ghost" onClick={onClose}>{l(COPY.btnCancel)}</button>
          <button type="button" className="ur-btn ur-btn--warn" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </DialogOverlay>
  );
}

// ── Dialog discriminated union ─────────────────────────────────────────────────

type ExplorerDialog =
  | { kind: 'none' }
  | { kind: 'add' }
  | { kind: 'edit';       row: LpExplorerRow }
  | { kind: 'deactivate'; row: LpExplorerRow };

// ── Lubrication Point Explorer ─────────────────────────────────────────────────

function LubricationPointExplorer(): React.ReactElement {
  const { locale } = useLanguage();
  const l = (b: L10n<string>) => t(b, locale);

  // ── Data state ──────────────────────────────────────────────────────────────
  const [rows,    setRows]    = useState<readonly LpExplorerRow[]>(() => lubricationPointService.list());
  const [dialog,  setDialog]  = useState<ExplorerDialog>({ kind: 'none' });
  const [opError, setOpError] = useState<string | null>(null);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [search,          setSearch]          = useState('');
  const [filterArea,      setFilterArea]      = useState('');
  const [filterContractor,setFilterContractor]= useState('');
  const [filterEquipment, setFilterEquipment] = useState('');
  const [filterOilType,   setFilterOilType]   = useState('');
  const [filterStatus,    setFilterStatus]    = useState('');

  // ── Derived filter options ──────────────────────────────────────────────────
  const areas       = useMemo(() => distinct(rows.map((r) => r.area)), [rows]);
  const contractors = useMemo(() => distinct(rows.map((r) => r.contractorId)), [rows]);
  const equipments  = useMemo(() => distinct(rows.map((r) => r.equipmentId)), [rows]);
  const oilTypes    = useMemo(() => distinct(rows.map((r) => r.oilType)), [rows]);

  // ── Filtered rows ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !r.equipmentId.toLowerCase().includes(q) && !r.lubricationPointId.toLowerCase().includes(q)) return false;
      if (filterArea        && r.area         !== filterArea)        return false;
      if (filterContractor  && r.contractorId !== filterContractor)  return false;
      if (filterEquipment   && r.equipmentId  !== filterEquipment)   return false;
      if (filterOilType     && r.oilType      !== filterOilType)     return false;
      if (filterStatus) {
        const status = computeLpStatus(r);
        if (status !== filterStatus) return false;
      }
      return true;
    });
  }, [rows, search, filterArea, filterContractor, filterEquipment, filterOilType, filterStatus]);

  // ── Summary counts ──────────────────────────────────────────────────────────
  const totalCount    = rows.length;
  const activeCount   = rows.filter((r) => computeLpStatus(r) === 'active').length;
  const overdueCount  = rows.filter((r) => computeLpStatus(r) === 'overdue').length;
  const dueSoonCount  = rows.filter((r) => computeLpStatus(r) === 'due-soon').length;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const refetch = useCallback(() => {
    setRows(lubricationPointService.list());
  }, []);

  function closeDialog(): void {
    setDialog({ kind: 'none' });
    setOpError(null);
  }

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleAdd(input: LpCreateInput): void {
    try {
      lubricationPointService.create(input);
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Operation failed.');
    }
  }

  function handleEdit(id: string, changes: Parameters<typeof lubricationPointService.update>[1]): void {
    try {
      lubricationPointService.update(id, changes);
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Operation failed.');
    }
  }

  function handleDeactivate(id: string): void {
    try {
      lubricationPointService.deactivate(id);
      refetch();
      closeDialog();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Operation failed.');
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="ur-page">

      {/* ── Page header ── */}
      <div className="ur-page__header">
        <div className="ur-page__header-text">
          <h1 className="ur-page__title">{l(COPY.explorerTitle)}</h1>
          <p className="ur-page__desc">{l(COPY.explorerDesc)}</p>
        </div>
        <StatusChip
          status="operational"
          label={l(COPY.explorerLive)}
          className="ur-page__sdk-badge"
        />
      </div>

      {/* ── Summary cards ── */}
      <div className="ur-summary-grid">
        <SummaryCard value={String(totalCount)}   label={l(COPY.sumTotal)}   modifier="neutral" />
        <SummaryCard value={String(activeCount)}  label={l(COPY.sumActive)}  modifier="info"    />
        <SummaryCard value={String(overdueCount)} label={l(COPY.sumOverdue)} modifier="warning" />
        <SummaryCard value={String(dueSoonCount)} label={l(COPY.sumDueSoon)} modifier="caution" />
      </div>

      {/* ── Toolbar: search + filters + add button ── */}
      <div className="ol-explorer-toolbar">
        <div className="ol-explorer-filters">
          <input
            className="ur-form-input ol-explorer-search"
            type="search"
            placeholder={l(COPY.searchPlaceholder)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={l(COPY.searchPlaceholder)}
          />
          <select
            className="ur-form-input ol-explorer-select"
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            aria-label={l(COPY.filterArea)}
          >
            <option value="">{l(COPY.filterArea)}</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            className="ur-form-input ol-explorer-select"
            value={filterContractor}
            onChange={(e) => setFilterContractor(e.target.value)}
            aria-label={l(COPY.filterContractor)}
          >
            <option value="">{l(COPY.filterContractor)}</option>
            {contractors.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="ur-form-input ol-explorer-select"
            value={filterEquipment}
            onChange={(e) => setFilterEquipment(e.target.value)}
            aria-label={l(COPY.filterEquipment)}
          >
            <option value="">{l(COPY.filterEquipment)}</option>
            {equipments.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
          </select>
          <select
            className="ur-form-input ol-explorer-select"
            value={filterOilType}
            onChange={(e) => setFilterOilType(e.target.value)}
            aria-label={l(COPY.filterOilType)}
          >
            <option value="">{l(COPY.filterOilType)}</option>
            {oilTypes.map((ot) => <option key={ot} value={ot}>{ot}</option>)}
          </select>
          <select
            className="ur-form-input ol-explorer-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label={l(COPY.filterStatus)}
          >
            <option value="">{l(COPY.filterStatus)}</option>
            <option value="active">   {l(COPY.statusActive)}</option>
            <option value="due-soon"> {l(COPY.statusDueSoon)}</option>
            <option value="overdue">  {l(COPY.statusOverdue)}</option>
            <option value="inactive"> {l(COPY.statusInactive)}</option>
          </select>
        </div>
        <button
          className="ur-btn ur-btn--primary"
          onClick={() => { setOpError(null); setDialog({ kind: 'add' }); }}
        >
          {l(COPY.addBtn)}
        </button>
      </div>

      {/* ── Table ── */}
      <div className="ur-table-wrap">
        <table className="ur-table">
          <thead>
            <tr>
              <th>{l(COPY.colLpCode)}</th>
              <th>{l(COPY.colEquipment)}</th>
              <th>{l(COPY.colName)}</th>
              <th>{l(COPY.colArea)}</th>
              <th>{l(COPY.colContractor)}</th>
              <th>{l(COPY.colOilType)}</th>
              <th>{l(COPY.colFrequency)}</th>
              <th>{l(COPY.colLastChange)}</th>
              <th>{l(COPY.colNextDue)}</th>
              <th>{l(COPY.colStatus)}</th>
              <th>{l(COPY.colActions)}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="ur-table__empty">
                  {l(COPY.noPoints)}
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const status = computeLpStatus(row);
                const chip   = lpStatusChip(status);
                return (
                  <tr key={row.id}>

                    {/* LP Code */}
                    <td>
                      <span className="ur-badge ur-badge--sm">{row.lubricationPointId}</span>
                    </td>

                    {/* Equipment ID */}
                    <td>
                      <div className="ur-user-name">{row.equipmentId}</div>
                    </td>

                    {/* Name */}
                    <td>
                      <div className="ur-user-name">{row.name}</div>
                    </td>

                    {/* Area */}
                    <td>{row.area}</td>

                    {/* Contractor */}
                    <td>
                      <span className="ur-badge ur-badge--sm">{row.contractorId}</span>
                    </td>

                    {/* Oil Type */}
                    <td className="ol-explorer-oil-type">{row.oilType}</td>

                    {/* Frequency */}
                    <td className="ur-table__date">
                      {row.frequencyDays}&nbsp;{l(COPY.freqDays)}
                    </td>

                    {/* Last Changed */}
                    <td className="ur-table__date">{formatDate(row.lastChangeDate)}</td>

                    {/* Next Due */}
                    <td className="ur-table__date ol-explorer-due-date" data-status={status}>
                      {formatDate(row.nextDueDate)}
                    </td>

                    {/* Status */}
                    <td>
                      <StatusChip status={chip.chipStatus} label={l(chip.label)} />
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="ur-action-group">
                        <button
                          className="ur-btn ur-btn--ghost ur-btn--sm"
                          onClick={() => { setOpError(null); setDialog({ kind: 'edit', row }); }}
                        >
                          {l(COPY.btnEdit)}
                        </button>
                        {row.isActive && (
                          <button
                            className="ur-btn ur-btn--ghost ur-btn--sm ur-btn--warn"
                            onClick={() => { setOpError(null); setDialog({ kind: 'deactivate', row }); }}
                          >
                            {l(COPY.btnDeact)}
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

      {dialog.kind === 'add' && (
        <AddLpDialog
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onAdd={handleAdd}
        />
      )}

      {dialog.kind === 'edit' && (
        <EditLpDialog
          row={dialog.row}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onEdit={handleEdit}
        />
      )}

      {dialog.kind === 'deactivate' && (
        <ConfirmDialog
          title={`${l(COPY.dlgDeactivateTitle)} — ${dialog.row.lubricationPointId}`}
          message={l(COPY.dlgDeactivateMsg)}
          confirmLabel={l(COPY.btnDeact)}
          locale={locale}
          opError={opError}
          onClose={closeDialog}
          onConfirm={() => handleDeactivate(dialog.row.id)}
        />
      )}

    </div>
  );
}

// ── Dashboard route ────────────────────────────────────────────────────────────

function OilDashboard(): React.ReactElement {
  const { locale } = useLanguage();
  const l = (bundle: L10n<string>) => t(bundle, locale);

  return (
    <div className="dashboard">

      {/* Module header */}
      <div className="dashboard-welcome">
        <div className="dashboard-welcome__text">
          <h1 className="dashboard-welcome__title">{l(COPY.moduleTitle)}</h1>
          <p className="dashboard-welcome__subtitle">{l(COPY.moduleDesc)}</p>
        </div>
        <StatusChip
          status="operational"
          label={l(COPY.statusReady)}
          className="dashboard-welcome__badge"
        />
      </div>

      {/* KPI summary */}
      <DashboardSection heading={l(COPY.secSummary)}>
        <div className="ol-kpi-grid">
          {KPI_CARDS.map((card) => (
            <OilKpiCardItem key={card.label.en} card={card} locale={locale} />
          ))}
        </div>
      </DashboardSection>

      {/* Recent Changes + Upcoming Tasks */}
      <div className="db-two-col">
        <div className="db-panel">
          <div className="db-panel__head">
            <span className="db-panel__title">{l(COPY.secChanges)}</span>
          </div>
          <div className="db-panel__body">
            <EmptyPanel message={l(COPY.noChanges)} />
          </div>
        </div>
        <div className="db-panel">
          <div className="db-panel__head">
            <span className="db-panel__title">{l(COPY.secTasks)}</span>
          </div>
          <div className="db-panel__body">
            <EmptyPanel message={l(COPY.noTasks)} />
          </div>
        </div>
      </div>

      {/* Route Status + Alerts */}
      <div className="db-two-col">
        <div className="db-panel">
          <div className="db-panel__head">
            <span className="db-panel__title">{l(COPY.secRoutes)}</span>
          </div>
          <div className="db-panel__body">
            <EmptyPanel message={l(COPY.noRoutes)} />
          </div>
        </div>
        <div className="db-panel">
          <div className="db-panel__head">
            <span className="db-panel__title">{l(COPY.secAlerts)}</span>
            <StatusChip status="operational" label={l(COPY.alertsClear)} />
          </div>
          <div className="db-panel__body">
            <EmptyPanel message={l(COPY.noAlerts)} />
          </div>
        </div>
      </div>

    </div>
  );
}

// ── Sub-page placeholder ───────────────────────────────────────────────────────

interface SubPageDef {
  readonly initials: string;
  readonly title:    L10n<string>;
  readonly desc:     L10n<string>;
}

function OilSubPage({ initials, title, desc }: SubPageDef): React.ReactElement {
  const { locale } = useLanguage();
  const l = (bundle: L10n<string>) => t(bundle, locale);

  return (
    <div className="placeholder-page">
      <div className="placeholder-page__icon" aria-hidden="true">{initials}</div>
      <h1 className="placeholder-page__title">{l(title)}</h1>
      <p className="placeholder-page__subtitle">{l(desc)}</p>
      <span className="placeholder-page__status">{l(COPY.comingSoon)}</span>
    </div>
  );
}

// ── OilLubricationPage — root with nested sub-routing ─────────────────────────
//
// The platform manifest registers this component at /oil-lubrication and also
// /oil-lubrication/* (because moduleNavItems is declared). Internal <Routes>
// picks up the remainder of the path and renders the correct sub-page.

export default function OilLubricationPage(): React.ReactElement {
  return (
    <Routes>

      <Route index element={<OilDashboard />} />

      <Route path="points" element={<LubricationPointExplorer />} />

      <Route
        path="oil-change"
        element={<OilSubPage initials="OC" title={COPY.oilChangeTitle} desc={COPY.oilChangeDesc} />}
      />

      <Route
        path="sampling"
        element={<OilSubPage initials="SA" title={COPY.samplingTitle} desc={COPY.samplingDesc} />}
      />

      <Route
        path="routes"
        element={<OilSubPage initials="RT" title={COPY.routesTitle} desc={COPY.routesDesc} />}
      />

      <Route
        path="forecast"
        element={<OilSubPage initials="FC" title={COPY.forecastTitle} desc={COPY.forecastDesc} />}
      />

      <Route
        path="reports"
        element={<OilSubPage initials="RP" title={COPY.reportsTitle} desc={COPY.reportsDesc} />}
      />

      <Route
        path="settings"
        element={<OilSubPage initials="ST" title={COPY.settingsTitle} desc={COPY.settingsDesc} />}
      />

      {/* Unknown sub-paths fall back to dashboard */}
      <Route path="*" element={<Navigate to="/oil-lubrication" replace />} />

    </Routes>
  );
}
