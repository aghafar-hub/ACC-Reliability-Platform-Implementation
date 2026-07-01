// apps/owner-center/src/pages/OilChangeCenter.tsx
// Oil Change Center — Sprint 04 Operational Stabilization
//
// Sprint 03: KPI header, task list, detail panel, 3-step wizard, history.
// Sprint 04: Approval workflow, reject dialog, permission guards, data warnings,
//            technician default from auth, success actions, all 6 status buckets,
//            LP preselection from detail panel.
//
// All copy is bilingual EN / AR.
// Desktop-first; RTL handled by shell CSS.

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { StatusChip } from '../components/StatusChip';
import type { ChipStatus } from '../components/StatusChip';
import {
  oilChangeService,
  type OcTask,
  type OcRecord,
  type OcStatus,
  type OcPriority,
  type OcWarning,
  type OcRecordCreateInput,
} from '../modules/oil-lubrication/oil-change.service';

// ── Locale helper ─────────────────────────────────────────────────────────────

interface L10n<T> { en: T; ar: T }
function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

// ── Permission helpers ─────────────────────────────────────────────────────────
// Role-based checks. In RC1 the SDK permission system is wired but contractor
// isolation and role mapping live in UserContext. We use role names defensively.

type OcRole = 'technician' | 'engineer' | 'manager' | 'admin' | 'unknown';

function resolveRole(userRole: string | undefined): OcRole {
  const r = (userRole ?? '').toLowerCase();
  if (r === 'admin')                         return 'admin';
  if (r === 'manager' || r === 'supervisor') return 'manager';
  if (r === 'engineer')                      return 'engineer';
  if (r === 'technician')                    return 'technician';
  return 'unknown';
}

function canApprove(role: OcRole): boolean {
  return role === 'engineer' || role === 'manager' || role === 'admin';
}

function canSubmit(role: OcRole): boolean {
  return role !== 'unknown';
}

// ── Copy ──────────────────────────────────────────────────────────────────────

const C = {
  // Page
  pageTitle:      { en: 'Oil Change Center',               ar: 'مركز تغيير الزيت'                  },
  pageDesc:       { en: 'Daily operational workspace — record, track, and manage all oil changes.',
                    ar: 'مساحة العمل اليومية — تسجيل وتتبع وإدارة جميع عمليات تغيير الزيت.'         },
  liveData:       { en: 'Live',                             ar: 'مباشر'                              },

  // KPIs
  kpiDueToday:    { en: 'Due Today',                       ar: 'مستحق اليوم'                        },
  kpiOverdue:     { en: 'Overdue',                         ar: 'متأخر'                              },
  kpiScheduled:   { en: 'Scheduled',                       ar: 'مجدول'                              },
  kpiCompToday:   { en: 'Completed Today',                 ar: 'مُنجز اليوم'                        },
  kpiPending:     { en: 'Pending Approval',                ar: 'بانتظار الموافقة'                   },
  kpiLpDue:       { en: 'lubrication points',              ar: 'نقطة تشحيم'                         },
  kpiLpOverdue:   { en: 'past due date',                   ar: 'تجاوز الموعد'                       },
  kpiLpScheduled: { en: 'future due dates',                ar: 'مواعيد قادمة'                       },
  kpiLpCompToday: { en: 'changes recorded today',          ar: 'تغيير مسجل اليوم'                   },
  kpiLpPending:   { en: 'awaiting review',                 ar: 'في انتظار المراجعة'                 },

  // Toolbar
  searchPh:       { en: 'Search by LP ID, Equipment ID or Name…',
                    ar: 'ابحث برمز النقطة أو معرّف المعدة أو الاسم…'                                },
  recordBtn:      { en: 'Record Oil Change',               ar: 'تسجيل تغيير زيت'                    },
  filterAll:      { en: 'All',                             ar: 'الكل'                               },
  filterDueToday: { en: 'Due Today',                       ar: 'مستحق اليوم'                        },
  filterOverdue:  { en: 'Overdue',                         ar: 'متأخر'                              },
  filterScheduled:{ en: 'Scheduled',                       ar: 'مجدول'                              },
  filterPending:  { en: 'Pending Approval',                ar: 'بانتظار الموافقة'                   },
  filterCompleted:{ en: 'Completed',                       ar: 'مكتمل'                              },
  fContractor:    { en: 'All Contractors',                 ar: 'جميع المقاولين'                     },
  fArea:          { en: 'All Areas',                       ar: 'جميع المناطق'                       },
  fOilType:       { en: 'All Oil Types',                   ar: 'جميع أنواع الزيت'                   },

  // Table columns
  colLpId:        { en: 'LP ID',                           ar: 'معرّف النقطة'                       },
  colEquipment:   { en: 'Equipment',                       ar: 'المعدة'                             },
  colPosition:    { en: 'Position',                        ar: 'الموقع'                             },
  colOil:         { en: 'Oil',                             ar: 'الزيت'                              },
  colStatus:      { en: 'Status',                          ar: 'الحالة'                             },
  colDueDate:     { en: 'Due Date',                        ar: 'تاريخ الاستحقاق'                    },
  colPriority:    { en: 'Priority',                        ar: 'الأولوية'                           },
  colContractor:  { en: 'Contractor',                      ar: 'المقاول'                            },

  // Status labels
  stScheduled:    { en: 'Scheduled',                       ar: 'مجدول'                              },
  stDueToday:     { en: 'Due Today',                       ar: 'مستحق اليوم'                        },
  stDueSoon:      { en: 'Due Soon',                        ar: 'مستحق قريباً'                       },
  stOverdue:      { en: 'Overdue',                         ar: 'متأخر'                              },
  stPending:      { en: 'Pending Approval',                ar: 'بانتظار الموافقة'                   },
  stCompleted:    { en: 'Completed',                       ar: 'مكتمل'                              },
  stOk:           { en: 'OK',                              ar: 'جيد'                                },
  stNoHistory:    { en: 'No History',                      ar: 'لا يوجد سجل'                        },
  stInactive:     { en: 'Inactive',                        ar: 'غير نشط'                            },

  // Priority labels
  prLow:          { en: 'Low',                             ar: 'منخفض'                              },
  prMedium:       { en: 'Medium',                          ar: 'متوسط'                              },
  prHigh:         { en: 'High',                            ar: 'عالٍ'                               },
  prCritical:     { en: 'Critical',                        ar: 'حرج'                                },

  // Empty states
  noTasks:        { en: 'No lubrication points match the selected filters.',
                    ar: 'لا توجد نقاط تشحيم تطابق المرشحات المحددة.'                                },
  selectRow:      { en: 'Select a row to view LP details.',
                    ar: 'حدد صفاً لعرض تفاصيل نقطة التشحيم.'                                        },

  // Detail panel
  dpTitle:        { en: 'LP Details',                      ar: 'تفاصيل نقطة التشحيم'                },
  dpEquipment:    { en: 'Equipment',                       ar: 'المعدة'                             },
  dpLp:           { en: 'Lubrication Point',               ar: 'نقطة التشحيم'                       },
  dpPosition:     { en: 'Position',                        ar: 'الموقع'                             },
  dpOilSpec:      { en: 'Oil Specification',               ar: 'مواصفات الزيت'                      },
  dpStdQty:       { en: 'Standard Quantity',               ar: 'الكمية القياسية'                     },
  dpFrequency:    { en: 'Frequency',                       ar: 'الترددية'                           },
  dpRunHrs:       { en: 'Running Hours',                   ar: 'ساعات التشغيل'                      },
  dpLastChange:   { en: 'Last Oil Change',                 ar: 'آخر تغيير زيت'                      },
  dpNextDue:      { en: 'Next Due',                        ar: 'الموعد القادم'                      },
  dpHistory:      { en: 'Recent History',                  ar: 'السجل الأخير'                       },
  dpRecordBtn:    { en: 'Record Oil Change',               ar: 'تسجيل تغيير زيت'                    },
  dpClose:        { en: 'Close',                           ar: 'إغلاق'                              },
  dpNoHistory:    { en: 'No records yet.',                 ar: 'لا توجد سجلات بعد.'                 },
  dpDays:         { en: 'days',                            ar: 'يوم'                                },
  dpLitres:       { en: 'L',                               ar: 'ل'                                  },
  dpNotAvail:     { en: '—',                               ar: '—'                                  },
  dpNotRecorded:  { en: 'Not recorded',                    ar: 'غير مسجل'                           },
  dpStatus:       { en: 'Status',                          ar: 'الحالة'                             },
  dpApprove:      { en: 'Approve',                         ar: 'موافقة'                             },
  dpReject:       { en: 'Reject',                          ar: 'رفض'                                },
  dpApproveTitle: { en: 'Approve Record',                  ar: 'الموافقة على السجل'                 },
  dpRejectTitle:  { en: 'Reject Record',                   ar: 'رفض السجل'                          },
  dpRejReason:    { en: 'Rejection Reason *',              ar: 'سبب الرفض *'                        },
  dpRejPlaceholder: { en: 'Describe the issue or what needs correction…',
                       ar: 'اشرح المشكلة أو ما يحتاج إلى تصحيح…'                                  },
  dpReviewedBy:   { en: 'Reviewed by',                     ar: 'راجعه'                              },

  // Wizard
  wzTitle:        { en: 'Record Oil Change',               ar: 'تسجيل تغيير زيت'                    },
  wzStep1:        { en: 'Review LP',                       ar: 'مراجعة نقطة التشحيم'                },
  wzStep2:        { en: 'Service Data',                    ar: 'بيانات الخدمة'                      },
  wzStep3:        { en: 'Review & Submit',                 ar: 'المراجعة والإرسال'                   },
  wzNext:         { en: 'Next',                            ar: 'التالي'                             },
  wzBack:         { en: 'Back',                            ar: 'رجوع'                               },
  wzCancel:       { en: 'Cancel',                          ar: 'إلغاء'                              },
  wzConfirm:      { en: 'Confirm & Submit',                ar: 'تأكيد وإرسال'                        },
  wzSubmitting:   { en: 'Submitting…',                     ar: 'جارٍ الإرسال…'                       },

  // Wizard step 1
  wz1SelectLp:    { en: 'Select Lubrication Point',        ar: 'اختر نقطة التشحيم'                  },
  wz1LpDetails:   { en: 'LP Details (read-only)',          ar: 'تفاصيل نقطة التشحيم (للقراءة فقط)'  },

  // Wizard step 2 fields
  wz2DatePerf:    { en: 'Date Performed',                  ar: 'تاريخ التنفيذ'                      },
  wz2OilType:     { en: 'Oil Type / Grade',                ar: 'نوع الزيت / الدرجة'                 },
  wz2Qty:         { en: 'Quantity Used (L)',               ar: 'الكمية المستخدمة (لتر)'              },
  wz2Tech:        { en: 'Technician Name',                 ar: 'اسم الفني'                          },
  wz2RunHrs:      { en: 'Running Hours',                   ar: 'ساعات التشغيل'                      },
  wz2Filter:      { en: 'Filter Changed',                  ar: 'تم تغيير الفلتر'                    },
  wz2Breather:    { en: 'Breather Serviced',               ar: 'تم صيانة المنفس'                    },
  wz2Wo:          { en: 'Work Order ID (optional)',         ar: 'معرّف أمر العمل (اختياري)'           },
  wz2Notes:       { en: 'Notes',                           ar: 'ملاحظات'                            },
  wz2Attach:      { en: 'Attachment URL (optional)',        ar: 'رابط المرفق (اختياري)'              },
  wz2Yes:         { en: 'Yes',                             ar: 'نعم'                                },
  wz2No:          { en: 'No',                              ar: 'لا'                                 },
  wz2Required:    { en: 'Required field',                  ar: 'حقل مطلوب'                          },
  wz2InvalidQty:  { en: 'Quantity must be greater than 0', ar: 'يجب أن تكون الكمية أكبر من صفر'     },
  wz2FutureDate:  { en: 'Date cannot be in the future',   ar: 'لا يمكن أن يكون التاريخ في المستقبل' },
  wz2InvalidUrl:  { en: 'Enter a valid URL',               ar: 'أدخل رابطاً صحيحاً'                 },

  // Wizard step 3
  wz3Summary:     { en: 'Submission Summary',              ar: 'ملخص الإرسال'                       },
  wz3StatusNote:  { en: 'This record will be created with status:',
                    ar: 'سيتم إنشاء هذا السجل بالحالة:'                                             },
  wz3Warnings:    { en: 'Data Warnings',                   ar: 'تحذيرات البيانات'                   },

  // Success
  successTitle:   { en: 'Oil Change Recorded',             ar: 'تم تسجيل تغيير الزيت'               },
  successMsg:     { en: 'Record submitted. Status: Pending Approval.',
                    ar: 'تم إرسال السجل. الحالة: بانتظار الموافقة.'                                 },
  successClose:   { en: 'Close',                           ar: 'إغلاق'                              },
  successAnother: { en: 'Record Another',                  ar: 'تسجيل آخر'                          },

  // History
  histTitle:      { en: 'Recent Oil Changes',              ar: 'تغييرات الزيت الأخيرة'              },
  histEmpty:      { en: 'No oil change records yet.',      ar: 'لا توجد سجلات تغيير زيت بعد.'       },
  histLp:         { en: 'LP',                              ar: 'نقطة'                               },
  histPerformed:  { en: 'Performed',                       ar: 'تاريخ التنفيذ'                      },
  histQty:        { en: 'Qty',                             ar: 'الكمية'                             },
  histTech:       { en: 'Technician',                      ar: 'الفني'                              },
  histStatus:     { en: 'Status',                          ar: 'الحالة'                             },
  histActions:    { en: 'Actions',                         ar: 'الإجراءات'                          },
} as const;

// ── Status → chip mapping ─────────────────────────────────────────────────────

function statusChip(s: OcStatus): { chip: ChipStatus; label: L10n<string> } {
  switch (s) {
    case 'scheduled':        return { chip: 'draft',         label: C.stScheduled  };
    case 'due-today':        return { chip: 'warning',       label: C.stDueToday   };
    case 'due-soon':         return { chip: 'warning',       label: C.stDueSoon    };
    case 'overdue':          return { chip: 'critical',      label: C.stOverdue    };
    case 'pending-approval': return { chip: 'maintenance',   label: C.stPending    };
    case 'completed':        return { chip: 'operational',   label: C.stCompleted  };
    case 'ok':               return { chip: 'operational',   label: C.stOk         };
    case 'no-history':       return { chip: 'draft',         label: C.stNoHistory  };
    case 'inactive':         return { chip: 'draft',         label: C.stInactive   };
  }
}

function recordStatusChip(s: string): { chip: ChipStatus; label: L10n<string> } {
  if (s === 'completed')  return { chip: 'operational', label: C.stCompleted };
  if (s === 'cancelled')  return { chip: 'draft',       label: { en: 'Cancelled', ar: 'ملغي' } };
  if (s === 'rejected')   return { chip: 'critical',    label: { en: 'Rejected',  ar: 'مرفوض' } };
  return { chip: 'maintenance', label: C.stPending };
}

// ── Priority badge ─────────────────────────────────────────────────────────────

function priorityLabel(p: OcPriority): L10n<string> {
  switch (p) {
    case 'low':      return C.prLow;
    case 'medium':   return C.prMedium;
    case 'high':     return C.prHigh;
    case 'critical': return C.prCritical;
  }
}

function priorityClass(p: OcPriority): string {
  return `oc-priority oc-priority--${p}`;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function isValidUrl(s: string): boolean {
  try { new URL(s); return true; }
  catch { return false; }
}

function distinct(arr: string[]): string[] {
  return Array.from(new Set(arr)).sort();
}

// ── KPI cards ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  value:   number;
  label:   string;
  subtext: string;
  variant: 'info' | 'critical' | 'warning' | 'operational' | 'maintenance';
}

function KpiCard({ value, label, subtext, variant }: KpiCardProps): React.ReactElement {
  return (
    <div className={`oc-kpi-card oc-kpi-card--${variant}`}>
      <span className="oc-kpi-card__value">{value}</span>
      <span className="oc-kpi-card__label">{label}</span>
      <span className="oc-kpi-card__sub">{subtext}</span>
    </div>
  );
}

interface OcKpisProps {
  tasks:   readonly OcTask[];
  records: readonly OcRecord[];
  locale:  string;
}

function OcKpis({ tasks, records, locale }: OcKpisProps): React.ReactElement {
  const today    = todayStr();
  const dueToday = tasks.filter((t) => t.status === 'due-today').length;
  const overdue  = tasks.filter((t) => t.status === 'overdue').length;
  const scheduled = tasks.filter((t) =>
    t.status === 'scheduled' || t.status === 'due-soon' || t.status === 'ok',
  ).length;
  const compToday = records.filter((r) => r.performedAt === today && r.status === 'completed').length;
  const pending  = tasks.filter((t) => t.status === 'pending-approval').length;

  const l = (b: L10n<string>) => t(b, locale);

  return (
    <div className="oc-kpi-strip">
      <KpiCard value={dueToday}  label={l(C.kpiDueToday)}  subtext={l(C.kpiLpDue)}       variant="warning"     />
      <KpiCard value={overdue}   label={l(C.kpiOverdue)}   subtext={l(C.kpiLpOverdue)}    variant="critical"    />
      <KpiCard value={scheduled} label={l(C.kpiScheduled)} subtext={l(C.kpiLpScheduled)}  variant="info"        />
      <KpiCard value={compToday} label={l(C.kpiCompToday)} subtext={l(C.kpiLpCompToday)}  variant="operational" />
      <KpiCard value={pending}   label={l(C.kpiPending)}   subtext={l(C.kpiLpPending)}    variant="maintenance" />
    </div>
  );
}

// ── Filter types ──────────────────────────────────────────────────────────────

type StatusFilter = '' | 'due-today' | 'overdue' | 'scheduled' | 'pending-approval' | 'completed';

interface OcFilters {
  status:     StatusFilter;
  contractor: string;
  area:       string;
  oilType:    string;
}

const DEFAULT_FILTERS: OcFilters = { status: '', contractor: '', area: '', oilType: '' };

// ── Toolbar ───────────────────────────────────────────────────────────────────

interface OcToolbarProps {
  search:      string;
  filters:     OcFilters;
  contractors: string[];
  areas:       string[];
  oilTypes:    string[];
  onSearch:    (v: string) => void;
  onFilters:   (f: OcFilters) => void;
  onRecord:    () => void;
  locale:      string;
  canSubmitRecord: boolean;
}

function OcToolbar({
  search, filters, contractors, areas, oilTypes,
  onSearch, onFilters, onRecord, locale, canSubmitRecord,
}: OcToolbarProps): React.ReactElement {
  const l = (b: L10n<string>) => t(b, locale);

  const statusFilters: Array<{ value: StatusFilter; label: L10n<string> }> = [
    { value: '',               label: C.filterAll       },
    { value: 'due-today',      label: C.filterDueToday  },
    { value: 'overdue',        label: C.filterOverdue   },
    { value: 'scheduled',      label: C.filterScheduled },
    { value: 'pending-approval', label: C.filterPending },
    { value: 'completed',      label: C.filterCompleted },
  ];

  return (
    <div className="oc-toolbar">
      {/* Search */}
      <input
        className="ur-form-input oc-toolbar__search"
        type="search"
        placeholder={l(C.searchPh)}
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        aria-label={l(C.searchPh)}
      />

      {/* Status quick-filter chips */}
      <div className="oc-toolbar__chips" role="group" aria-label="Status filter">
        {statusFilters.map(({ value, label }) => (
          <button
            key={value}
            className={`oc-chip ${filters.status === value ? 'oc-chip--active' : ''}`}
            onClick={() => onFilters({ ...filters, status: value })}
          >
            {l(label)}
          </button>
        ))}
      </div>

      {/* Dropdown filters */}
      <div className="oc-toolbar__dropdowns">
        <select
          className="ur-form-input oc-toolbar__select"
          value={filters.contractor}
          onChange={(e) => onFilters({ ...filters, contractor: e.target.value })}
          aria-label={l(C.fContractor)}
        >
          <option value="">{l(C.fContractor)}</option>
          {contractors.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          className="ur-form-input oc-toolbar__select"
          value={filters.area}
          onChange={(e) => onFilters({ ...filters, area: e.target.value })}
          aria-label={l(C.fArea)}
        >
          <option value="">{l(C.fArea)}</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          className="ur-form-input oc-toolbar__select"
          value={filters.oilType}
          onChange={(e) => onFilters({ ...filters, oilType: e.target.value })}
          aria-label={l(C.fOilType)}
        >
          <option value="">{l(C.fOilType)}</option>
          {oilTypes.map((ot) => <option key={ot} value={ot}>{ot}</option>)}
        </select>
      </div>

      {/* Primary action — only visible to users who can submit */}
      {canSubmitRecord && (
        <button className="ur-btn ur-btn--primary oc-toolbar__record-btn" onClick={onRecord}>
          {l(C.recordBtn)}
        </button>
      )}
    </div>
  );
}

// ── Task list ─────────────────────────────────────────────────────────────────

interface OcTaskRowProps {
  task:       OcTask;
  selected:   boolean;
  onClick:    () => void;
  locale:     string;
}

function OcTaskRow({ task, selected, onClick, locale }: OcTaskRowProps): React.ReactElement {
  const l  = (b: L10n<string>) => t(b, locale);
  const sc = statusChip(task.status);

  return (
    <tr
      className={`oc-task-row ${selected ? 'oc-task-row--selected' : ''}`}
      onClick={onClick}
      tabIndex={0}
      role="row"
      aria-selected={selected}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      <td>
        <span className="ur-badge ur-badge--sm">{task.lpId}</span>
      </td>
      <td>
        <div className="oc-task-row__equip-name">{task.equipmentName}</div>
        <div className="oc-task-row__equip-id">{task.equipmentId}</div>
      </td>
      <td className="oc-task-row__position">{task.position}</td>
      <td className="oc-task-row__oil">{task.oilType}</td>
      <td>
        <StatusChip status={sc.chip} label={l(sc.label)} />
      </td>
      <td className={`oc-task-row__due ${task.status === 'overdue' ? 'oc-task-row__due--overdue' : ''}`}>
        {fmtDate(task.dueDate)}
      </td>
      <td>
        <span className={priorityClass(task.priority)}>
          {l(priorityLabel(task.priority))}
        </span>
      </td>
      <td>
        <span className="ur-badge ur-badge--sm">{task.contractorId}</span>
      </td>
    </tr>
  );
}

interface OcTaskListProps {
  tasks:      readonly OcTask[];
  selectedId: string | null;
  onSelect:   (id: string) => void;
  locale:     string;
}

function OcTaskList({ tasks, selectedId, onSelect, locale }: OcTaskListProps): React.ReactElement {
  const l = (b: L10n<string>) => t(b, locale);

  return (
    <div className="oc-task-list ur-table-wrap">
      <table className="ur-table oc-table" role="grid">
        <thead>
          <tr>
            <th>{l(C.colLpId)}</th>
            <th>{l(C.colEquipment)}</th>
            <th>{l(C.colPosition)}</th>
            <th>{l(C.colOil)}</th>
            <th>{l(C.colStatus)}</th>
            <th>{l(C.colDueDate)}</th>
            <th>{l(C.colPriority)}</th>
            <th>{l(C.colContractor)}</th>
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={8} className="ur-table__empty">{l(C.noTasks)}</td>
            </tr>
          ) : (
            tasks.map((task) => (
              <OcTaskRow
                key={task.id}
                task={task}
                selected={task.id === selectedId}
                onClick={() => onSelect(task.id)}
                locale={locale}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Reject dialog (inline inside Detail Panel) ────────────────────────────────

interface RejectDialogProps {
  record:    OcRecord;
  reviewerName: string;
  locale:    string;
  onConfirm: (reason: string) => void;
  onCancel:  () => void;
}

function RejectDialog({ record, reviewerName, locale, onConfirm, onCancel }: RejectDialogProps): React.ReactElement {
  const l = (b: L10n<string>) => t(b, locale);
  const [reason, setReason] = useState('');
  const [error,  setError]  = useState('');

  function handleConfirm(): void {
    const trimmed = reason.trim();
    if (!trimmed) { setError(l(C.wz2Required)); return; }
    onConfirm(trimmed);
  }

  return (
    <div className="oc-reject-dialog" role="dialog" aria-modal="true" aria-label={l(C.dpRejectTitle)}>
      <div className="oc-reject-dialog__body">
        <h3 className="oc-reject-dialog__title">{l(C.dpRejectTitle)}</h3>
        <p className="oc-reject-dialog__record-meta">
          {record.lpId} · {record.equipmentName} · {fmtDate(record.performedAt)}
        </p>
        <div className="ur-form-field">
          <label className="ur-form-label">{l(C.dpRejReason)}</label>
          <textarea
            className={`ur-form-input oc-textarea ${error ? 'ur-form-input--error' : ''}`}
            rows={3}
            value={reason}
            onChange={(e) => { setReason(e.target.value); if (e.target.value) setError(''); }}
            placeholder={l(C.dpRejPlaceholder)}
            autoFocus
          />
          {error && <p className="ur-form-error">{error}</p>}
        </div>
        <div className="oc-reject-dialog__footer">
          <button type="button" className="ur-btn ur-btn--ghost ur-btn--sm" onClick={onCancel}>
            {l(C.wzCancel)}
          </button>
          <button type="button" className="ur-btn ur-btn--sm oc-reject-dialog__confirm-btn" onClick={handleConfirm}>
            {l(C.dpReject)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

interface OcDetailPanelProps {
  task:       OcTask;
  records:    readonly OcRecord[];
  onClose:    () => void;
  onRecord:   () => void;
  onApprove:  (recordId: string) => void;
  onReject:   (recordId: string, reason: string) => void;
  locale:     string;
  canApprove: boolean;
  reviewerName: string;
}

function OcDetailPanel({
  task, records, onClose, onRecord, onApprove, onReject,
  locale, canApprove: hasApprovePermission, reviewerName,
}: OcDetailPanelProps): React.ReactElement {
  const l  = (b: L10n<string>) => t(b, locale);
  const sc = statusChip(task.status);

  const [rejectingRecordId, setRejectingRecordId] = useState<string | null>(null);

  const taskRecords = records
    .filter((r) => r.taskId === task.id)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .slice(0, 5);

  const pendingRecord = taskRecords.find((r) => r.status === 'pending-approval') ?? null;

  return (
    <aside className="oc-detail-panel" aria-label={l(C.dpTitle)}>

      {/* Panel header */}
      <div className="oc-detail-panel__head">
        <span className="oc-detail-panel__title">{l(C.dpTitle)}</span>
        <button
          className="ur-btn ur-btn--ghost ur-btn--sm"
          onClick={onClose}
          aria-label={l(C.dpClose)}
        >
          ✕
        </button>
      </div>

      {/* Status badge */}
      <div className="oc-detail-panel__status-row">
        <span className="ur-badge ur-badge--lg">{task.lpId}</span>
        <StatusChip status={sc.chip} label={l(sc.label)} />
        <span className={priorityClass(task.priority)}>{l(priorityLabel(task.priority))}</span>
      </div>

      {/* Fields */}
      <dl className="oc-detail-panel__fields">
        <div className="oc-detail-panel__field">
          <dt>{l(C.dpEquipment)}</dt>
          <dd>
            <span className="oc-detail-panel__equip-name">{task.equipmentName}</span>
            <span className="oc-detail-panel__equip-id">{task.equipmentId}</span>
          </dd>
        </div>
        <div className="oc-detail-panel__field">
          <dt>{l(C.dpLp)}</dt>
          <dd>{task.lpId}</dd>
        </div>
        <div className="oc-detail-panel__field">
          <dt>{l(C.dpPosition)}</dt>
          <dd>{task.position || l(C.dpNotAvail)}</dd>
        </div>
        <div className="oc-detail-panel__field">
          <dt>{l(C.dpOilSpec)}</dt>
          <dd>{task.oilType}</dd>
        </div>
        <div className="oc-detail-panel__field">
          <dt>{l(C.dpStdQty)}</dt>
          <dd>{task.standardQuantityL} {l(C.dpLitres)}</dd>
        </div>
        <div className="oc-detail-panel__field">
          <dt>{l(C.dpFrequency)}</dt>
          <dd>{task.frequencyDays} {l(C.dpDays)}</dd>
        </div>
        <div className="oc-detail-panel__field">
          <dt>{l(C.dpRunHrs)}</dt>
          <dd>{task.runningHours !== null ? task.runningHours.toLocaleString() : l(C.dpNotRecorded)}</dd>
        </div>
        <div className="oc-detail-panel__field">
          <dt>{l(C.dpLastChange)}</dt>
          <dd>{fmtDate(task.lastChangeDate)}</dd>
        </div>
        <div className="oc-detail-panel__field">
          <dt>{l(C.dpNextDue)}</dt>
          <dd className={task.status === 'overdue' ? 'oc-detail-panel__overdue' : ''}>
            {fmtDate(task.dueDate)}
          </dd>
        </div>
      </dl>

      {/* Approval actions — only shown when there is a pending record and user can approve */}
      {hasApprovePermission && pendingRecord && !rejectingRecordId && (
        <div className="oc-approval-actions">
          <p className="oc-approval-actions__label">
            {locale === 'ar'
              ? `سجل بانتظار الموافقة — ${pendingRecord.technicianName}`
              : `Record pending approval — ${pendingRecord.technicianName}`}
          </p>
          <div className="oc-approval-actions__btns">
            <button
              className="ur-btn ur-btn--sm oc-approval-actions__approve-btn"
              onClick={() => onApprove(pendingRecord.id)}
            >
              {l(C.dpApprove)}
            </button>
            <button
              className="ur-btn ur-btn--ghost ur-btn--sm oc-approval-actions__reject-btn"
              onClick={() => setRejectingRecordId(pendingRecord.id)}
            >
              {l(C.dpReject)}
            </button>
          </div>
        </div>
      )}

      {/* Inline reject dialog */}
      {rejectingRecordId && pendingRecord && (
        <RejectDialog
          record={pendingRecord}
          reviewerName={reviewerName}
          locale={locale}
          onConfirm={(reason) => {
            onReject(rejectingRecordId, reason);
            setRejectingRecordId(null);
          }}
          onCancel={() => setRejectingRecordId(null)}
        />
      )}

      {/* Record button */}
      <div className="oc-detail-panel__actions">
        <button className="ur-btn ur-btn--primary oc-detail-panel__record-btn" onClick={onRecord}>
          {l(C.dpRecordBtn)}
        </button>
      </div>

      {/* Recent history */}
      <div className="oc-detail-panel__history">
        <h3 className="oc-detail-panel__history-title">{l(C.dpHistory)}</h3>
        {taskRecords.length === 0 ? (
          <p className="oc-detail-panel__history-empty">{l(C.dpNoHistory)}</p>
        ) : (
          <ul className="oc-detail-panel__history-list">
            {taskRecords.map((r) => {
              const rsc = recordStatusChip(r.status);
              return (
                <li key={r.id} className="oc-detail-panel__history-item">
                  <div className="oc-detail-panel__history-row">
                    <span className="oc-detail-panel__history-date">{fmtDate(r.performedAt)}</span>
                    <StatusChip status={rsc.chip} label={l(rsc.label)} />
                  </div>
                  <div className="oc-detail-panel__history-meta">
                    {r.quantityUsed} {l(C.dpLitres)} · {r.oilTypeUsed} · {r.technicianName}
                  </div>
                  {r.rejectionReason && (
                    <div className="oc-detail-panel__history-reject">
                      {locale === 'ar' ? 'سبب الرفض: ' : 'Rejected: '}{r.rejectionReason}
                    </div>
                  )}
                  {r.reviewedBy && r.status === 'completed' && (
                    <div className="oc-detail-panel__history-reviewer">
                      {l(C.dpReviewedBy)}: {r.reviewedBy}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

    </aside>
  );
}

// ── 3-Step Wizard ─────────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 'success';

interface WizardFormData {
  lpTaskId:        string;
  performedAt:     string;
  oilType:         string;
  qty:             string;
  technicianName:  string;
  runningHours:    string;
  filterChanged:   boolean;
  breatherServiced: boolean;
  workOrderId:     string;
  notes:           string;
  attachmentUri:   string;
}

function emptyForm(task: OcTask | null, defaultTechName: string): WizardFormData {
  return {
    lpTaskId:        task?.id ?? '',
    performedAt:     todayStr(),
    oilType:         task?.oilType ?? '',
    qty:             task ? String(task.standardQuantityL) : '',
    technicianName:  defaultTechName,
    runningHours:    task?.runningHours !== null && task?.runningHours !== undefined ? String(task.runningHours) : '',
    filterChanged:   false,
    breatherServiced: false,
    workOrderId:     '',
    notes:           '',
    attachmentUri:   '',
  };
}

interface WizardErrors {
  oilType?:       string;
  qty?:           string;
  performedAt?:   string;
  attachmentUri?: string;
  technicianName?: string;
}

function validateStep2(form: WizardFormData, l: (b: L10n<string>) => string): WizardErrors {
  const errors: WizardErrors = {};
  if (!form.oilType.trim())      errors.oilType = l(C.wz2Required);
  if (!form.technicianName.trim()) errors.technicianName = l(C.wz2Required);
  const qtyNum = parseFloat(form.qty);
  if (!form.qty || isNaN(qtyNum) || qtyNum <= 0) errors.qty = l(C.wz2InvalidQty);
  if (!form.performedAt)         errors.performedAt = l(C.wz2Required);
  if (form.performedAt > todayStr()) errors.performedAt = l(C.wz2FutureDate);
  if (form.attachmentUri && !isValidUrl(form.attachmentUri)) errors.attachmentUri = l(C.wz2InvalidUrl);
  return errors;
}

interface OcWizardProps {
  open:          boolean;
  allTasks:      readonly OcTask[];
  initialTask:   OcTask | null;
  onClose:       () => void;
  onSubmit:      (record: OcRecord, updatedTask: OcTask) => void;
  onRecordAnother: () => void;
  locale:        string;
  defaultTechName: string;
}

function OcWizard({
  open, allTasks, initialTask, onClose, onSubmit, onRecordAnother, locale, defaultTechName,
}: OcWizardProps): React.ReactElement | null {
  const l = (b: L10n<string>) => t(b, locale);

  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<WizardFormData>(() => emptyForm(initialTask, defaultTechName));
  const [errors, setErrors] = useState<WizardErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [warnings, setWarnings] = useState<readonly OcWarning[]>([]);

  // Reset when wizard opens/closes or initialTask changes
  const prevOpen = useRef(open);
  if (prevOpen.current !== open) {
    prevOpen.current = open;
    if (open) {
      setStep(1);
      setForm(emptyForm(initialTask, defaultTechName));
      setErrors({});
      setSubmitting(false);
      setWarnings([]);
    }
  }

  if (!open) return null;

  const selectedTask = allTasks.find((tt) => tt.id === form.lpTaskId) ?? null;

  // ── Step navigation ──────────────────────────────────────────────────────

  function goNext(): void {
    if (step === 1) {
      if (!form.lpTaskId) return;
      const task = allTasks.find((tt) => tt.id === form.lpTaskId);
      if (task && !form.oilType) {
        setForm((f) => ({ ...f, oilType: task.oilType }));
      }
      setStep(2);
    } else if (step === 2) {
      const errs = validateStep2(form, l);
      if (Object.keys(errs).length > 0) { setErrors(errs); return; }
      setErrors({});
      // Compute warnings before step 3
      if (selectedTask) {
        const input: OcRecordCreateInput = {
          taskId:          selectedTask.id,
          oilTypeUsed:     form.oilType.trim(),
          quantityUsed:    parseFloat(form.qty),
          filterChanged:   form.filterChanged,
          breatherServiced: form.breatherServiced,
          runningHours:    form.runningHours ? parseFloat(form.runningHours) : null,
          technicianName:  form.technicianName.trim(),
          workOrderId:     form.workOrderId.trim() || null,
          notes:           form.notes.trim() || null,
          attachmentUri:   form.attachmentUri.trim() || null,
          performedAt:     form.performedAt,
        };
        setWarnings(oilChangeService.computeWarnings(input, selectedTask));
      }
      setStep(3);
    }
  }

  function goBack(): void {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  function handleSubmit(): void {
    if (!selectedTask) return;
    setSubmitting(true);

    const input: OcRecordCreateInput = {
      taskId:         selectedTask.id,
      oilTypeUsed:    form.oilType.trim(),
      quantityUsed:   parseFloat(form.qty),
      filterChanged:  form.filterChanged,
      breatherServiced: form.breatherServiced,
      runningHours:   form.runningHours ? parseFloat(form.runningHours) : null,
      technicianName: form.technicianName.trim(),
      workOrderId:    form.workOrderId.trim() || null,
      notes:          form.notes.trim() || null,
      attachmentUri:  form.attachmentUri.trim() || null,
      performedAt:    form.performedAt,
    };

    try {
      const { task: updatedTask, record: newRecord } = oilChangeService.submitRecord(input);
      onSubmit(newRecord, updatedTask);
      setStep('success');
    } catch (err) {
      console.error('Oil change submit error', err);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Step progress indicator ───────────────────────────────────────────────

  const STEPS: Array<L10n<string>> = [C.wzStep1, C.wzStep2, C.wzStep3];

  // ── Warning kind to icon ───────────────────────────────────────────────────
  function warningIcon(kind: OcWarning['kind']): string {
    switch (kind) {
      case 'quantity-deviation':       return '⚠';
      case 'oil-type-changed':         return '🔄';
      case 'running-hours-regression': return '⏱';
      case 'inactive-lp':              return '⛔';
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="oc-wizard-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={l(C.wzTitle)}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="oc-wizard">

        {/* Header */}
        <div className="oc-wizard__header">
          <span className="oc-wizard__title">{l(C.wzTitle)}</span>
          <button className="ur-dialog__close" aria-label={l(C.wzCancel)} onClick={onClose}>✕</button>
        </div>

        {/* Step progress */}
        {step !== 'success' && (
          <div className="oc-wizard__steps" role="tablist">
            {STEPS.map((stepLabel, idx) => {
              const stepNum = (idx + 1) as 1 | 2 | 3;
              const active  = step === stepNum;
              const done    = typeof step === 'number' && step > stepNum;
              return (
                <div
                  key={idx}
                  className={`oc-wizard__step ${active ? 'oc-wizard__step--active' : ''} ${done ? 'oc-wizard__step--done' : ''}`}
                  role="tab"
                  aria-selected={active}
                >
                  <span className="oc-wizard__step-num">{done ? '✓' : stepNum}</span>
                  <span className="oc-wizard__step-label">{l(stepLabel)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div className="oc-wizard__body">

          {/* ── Step 1: Review LP ── */}
          {step === 1 && (
            <div className="oc-wizard__step-body">
              <div className="ur-form-field">
                <label className="ur-form-label">{l(C.wz1SelectLp)}</label>
                <select
                  className="ur-form-input"
                  value={form.lpTaskId}
                  onChange={(e) => {
                    const taskId = e.target.value;
                    const task = allTasks.find((tt) => tt.id === taskId);
                    setForm((f) => ({
                      ...f,
                      lpTaskId: taskId,
                      oilType:  task?.oilType ?? f.oilType,
                      qty:      task ? String(task.standardQuantityL) : f.qty,
                      runningHours: task?.runningHours != null ? String(task.runningHours) : f.runningHours,
                    }));
                  }}
                  autoFocus
                >
                  <option value="">—</option>
                  {allTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.lpId} — {task.equipmentName} ({task.area})
                    </option>
                  ))}
                </select>
              </div>

              {selectedTask && (
                <div className="oc-wizard__lp-review">
                  <div className="oc-wizard__lp-review-title">{l(C.wz1LpDetails)}</div>
                  <dl className="oc-wizard__lp-fields">
                    <div><dt>{l(C.dpEquipment)}</dt><dd>{selectedTask.equipmentName} ({selectedTask.equipmentId})</dd></div>
                    <div><dt>{l(C.dpLp)}</dt><dd>{selectedTask.lpId}</dd></div>
                    <div><dt>{l(C.dpPosition)}</dt><dd>{selectedTask.position}</dd></div>
                    <div><dt>{l(C.dpOilSpec)}</dt><dd>{selectedTask.oilType}</dd></div>
                    <div><dt>{l(C.dpStdQty)}</dt><dd>{selectedTask.standardQuantityL} {l(C.dpLitres)}</dd></div>
                    <div><dt>{l(C.dpFrequency)}</dt><dd>{selectedTask.frequencyDays} {l(C.dpDays)}</dd></div>
                    <div><dt>{l(C.dpLastChange)}</dt><dd>{fmtDate(selectedTask.lastChangeDate)}</dd></div>
                    <div><dt>{l(C.dpNextDue)}</dt><dd className={selectedTask.status === 'overdue' ? 'oc-wizard__overdue' : ''}>{fmtDate(selectedTask.dueDate)}</dd></div>
                    <div>
                      <dt>{l(C.dpStatus)}</dt>
                      <dd><StatusChip status={statusChip(selectedTask.status).chip} label={l(statusChip(selectedTask.status).label)} /></dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Enter service data ── */}
          {step === 2 && selectedTask && (
            <div className="oc-wizard__step-body">
              <div className="oc-wizard__form-grid">

                {/* Date performed */}
                <div className="ur-form-field">
                  <label className="ur-form-label">{l(C.wz2DatePerf)} *</label>
                  <input
                    className={`ur-form-input ${errors.performedAt ? 'ur-form-input--error' : ''}`}
                    type="date"
                    max={todayStr()}
                    value={form.performedAt}
                    onChange={(e) => setForm((f) => ({ ...f, performedAt: e.target.value }))}
                  />
                  {errors.performedAt && <p className="ur-form-error">{errors.performedAt}</p>}
                </div>

                {/* Oil type */}
                <div className="ur-form-field">
                  <label className="ur-form-label">{l(C.wz2OilType)} *</label>
                  <input
                    className={`ur-form-input ${errors.oilType ? 'ur-form-input--error' : ''}`}
                    type="text"
                    value={form.oilType}
                    onChange={(e) => setForm((f) => ({ ...f, oilType: e.target.value }))}
                    placeholder={selectedTask.oilType}
                    autoFocus
                  />
                  {errors.oilType && <p className="ur-form-error">{errors.oilType}</p>}
                </div>

                {/* Quantity */}
                <div className="ur-form-field">
                  <label className="ur-form-label">{l(C.wz2Qty)} *</label>
                  <input
                    className={`ur-form-input ${errors.qty ? 'ur-form-input--error' : ''}`}
                    type="number"
                    min="0.01"
                    step="0.1"
                    value={form.qty}
                    onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
                    placeholder={String(selectedTask.standardQuantityL)}
                  />
                  {errors.qty && <p className="ur-form-error">{errors.qty}</p>}
                </div>

                {/* Technician name */}
                <div className="ur-form-field">
                  <label className="ur-form-label">{l(C.wz2Tech)} *</label>
                  <input
                    className={`ur-form-input ${errors.technicianName ? 'ur-form-input--error' : ''}`}
                    type="text"
                    value={form.technicianName}
                    onChange={(e) => setForm((f) => ({ ...f, technicianName: e.target.value }))}
                    placeholder="e.g. Ahmed Al-Rashidi"
                  />
                  {errors.technicianName && <p className="ur-form-error">{errors.technicianName}</p>}
                </div>

                {/* Running hours */}
                <div className="ur-form-field">
                  <label className="ur-form-label">{l(C.wz2RunHrs)}</label>
                  <input
                    className="ur-form-input"
                    type="number"
                    min="0"
                    step="1"
                    value={form.runningHours}
                    onChange={(e) => setForm((f) => ({ ...f, runningHours: e.target.value }))}
                    placeholder="e.g. 4820"
                  />
                </div>

                {/* Work order ID */}
                <div className="ur-form-field">
                  <label className="ur-form-label">{l(C.wz2Wo)}</label>
                  <input
                    className="ur-form-input"
                    type="text"
                    value={form.workOrderId}
                    onChange={(e) => setForm((f) => ({ ...f, workOrderId: e.target.value }))}
                    placeholder="e.g. WO-2026-1234"
                  />
                </div>

                {/* Filter changed */}
                <div className="ur-form-field oc-form-field--toggle">
                  <span className="ur-form-label">{l(C.wz2Filter)}</span>
                  <div className="oc-toggle-group">
                    <button
                      type="button"
                      className={`oc-toggle-btn ${form.filterChanged ? 'oc-toggle-btn--active' : ''}`}
                      onClick={() => setForm((f) => ({ ...f, filterChanged: true }))}
                    >{l(C.wz2Yes)}</button>
                    <button
                      type="button"
                      className={`oc-toggle-btn ${!form.filterChanged ? 'oc-toggle-btn--active' : ''}`}
                      onClick={() => setForm((f) => ({ ...f, filterChanged: false }))}
                    >{l(C.wz2No)}</button>
                  </div>
                </div>

                {/* Breather serviced */}
                <div className="ur-form-field oc-form-field--toggle">
                  <span className="ur-form-label">{l(C.wz2Breather)}</span>
                  <div className="oc-toggle-group">
                    <button
                      type="button"
                      className={`oc-toggle-btn ${form.breatherServiced ? 'oc-toggle-btn--active' : ''}`}
                      onClick={() => setForm((f) => ({ ...f, breatherServiced: true }))}
                    >{l(C.wz2Yes)}</button>
                    <button
                      type="button"
                      className={`oc-toggle-btn ${!form.breatherServiced ? 'oc-toggle-btn--active' : ''}`}
                      onClick={() => setForm((f) => ({ ...f, breatherServiced: false }))}
                    >{l(C.wz2No)}</button>
                  </div>
                </div>

                {/* Notes */}
                <div className="ur-form-field oc-form-field--full">
                  <label className="ur-form-label">{l(C.wz2Notes)}</label>
                  <textarea
                    className="ur-form-input oc-textarea"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Field observations, anomalies, conditions…"
                  />
                </div>

                {/* Attachment URL */}
                <div className="ur-form-field oc-form-field--full">
                  <label className="ur-form-label">{l(C.wz2Attach)}</label>
                  <input
                    className={`ur-form-input ${errors.attachmentUri ? 'ur-form-input--error' : ''}`}
                    type="url"
                    value={form.attachmentUri}
                    onChange={(e) => setForm((f) => ({ ...f, attachmentUri: e.target.value }))}
                    placeholder="https://drive.google.com/…"
                  />
                  {errors.attachmentUri && <p className="ur-form-error">{errors.attachmentUri}</p>}
                </div>

              </div>
            </div>
          )}

          {/* ── Step 3: Review & Submit ── */}
          {step === 3 && selectedTask && (
            <div className="oc-wizard__step-body">
              <div className="oc-wizard__review">
                <div className="oc-wizard__review-section">
                  <div className="oc-wizard__review-heading">{l(C.wz3Summary)}</div>
                  <dl className="oc-wizard__review-fields">
                    <div><dt>{l(C.dpLp)}</dt><dd>{selectedTask.lpId} — {selectedTask.equipmentName}</dd></div>
                    <div><dt>{l(C.dpPosition)}</dt><dd>{selectedTask.position}</dd></div>
                    <div><dt>{l(C.wz2DatePerf)}</dt><dd>{fmtDate(form.performedAt)}</dd></div>
                    <div><dt>{l(C.wz2OilType)}</dt><dd>{form.oilType}</dd></div>
                    <div><dt>{l(C.wz2Qty)}</dt><dd>{form.qty} {l(C.dpLitres)}</dd></div>
                    <div><dt>{l(C.wz2Tech)}</dt><dd>{form.technicianName}</dd></div>
                    {form.runningHours && <div><dt>{l(C.wz2RunHrs)}</dt><dd>{form.runningHours}</dd></div>}
                    <div><dt>{l(C.wz2Filter)}</dt><dd>{form.filterChanged ? l(C.wz2Yes) : l(C.wz2No)}</dd></div>
                    <div><dt>{l(C.wz2Breather)}</dt><dd>{form.breatherServiced ? l(C.wz2Yes) : l(C.wz2No)}</dd></div>
                    {form.workOrderId && <div><dt>{l(C.wz2Wo)}</dt><dd>{form.workOrderId}</dd></div>}
                    {form.notes && <div><dt>{l(C.wz2Notes)}</dt><dd>{form.notes}</dd></div>}
                    {form.attachmentUri && (
                      <div>
                        <dt>{l(C.wz2Attach)}</dt>
                        <dd><a href={form.attachmentUri} target="_blank" rel="noreferrer">{form.attachmentUri}</a></dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Data warnings */}
                {warnings.length > 0 && (
                  <div className="oc-warnings">
                    <div className="oc-warnings__heading">{l(C.wz3Warnings)}</div>
                    <ul className="oc-warnings__list">
                      {warnings.map((w) => (
                        <li key={w.kind} className={`oc-warnings__item oc-warnings__item--${w.kind}`}>
                          <span className="oc-warnings__icon" aria-hidden="true">{warningIcon(w.kind)}</span>
                          <span>{w.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="oc-wizard__status-note">
                  <span>{l(C.wz3StatusNote)}</span>
                  <StatusChip status="maintenance" label={l(C.stPending)} />
                </div>
              </div>
            </div>
          )}

          {/* ── Success state ── */}
          {step === 'success' && (
            <div className="oc-wizard__success">
              <div className="oc-wizard__success-icon" aria-hidden="true">✓</div>
              <h2 className="oc-wizard__success-title">{l(C.successTitle)}</h2>
              <p className="oc-wizard__success-msg">{l(C.successMsg)}</p>
              <StatusChip status="maintenance" label={l(C.stPending)} />
              <div className="oc-success-actions">
                <button className="ur-btn ur-btn--ghost" onClick={onClose}>
                  {l(C.successClose)}
                </button>
                <button className="ur-btn ur-btn--primary" onClick={onRecordAnother}>
                  {l(C.successAnother)}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="oc-wizard__footer">
          {step !== 'success' && step !== 1 && (
            <button className="ur-btn ur-btn--ghost" onClick={goBack} disabled={submitting}>
              {l(C.wzBack)}
            </button>
          )}
          <div className="oc-wizard__footer-right">
            {step === 'success' ? null : step === 3 ? (
              <>
                <button className="ur-btn ur-btn--ghost" onClick={onClose} disabled={submitting}>
                  {l(C.wzCancel)}
                </button>
                <button
                  className="ur-btn ur-btn--primary"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? l(C.wzSubmitting) : l(C.wzConfirm)}
                </button>
              </>
            ) : (
              <>
                <button className="ur-btn ur-btn--ghost" onClick={onClose}>{l(C.wzCancel)}</button>
                <button
                  className="ur-btn ur-btn--primary"
                  onClick={goNext}
                  disabled={step === 1 && !form.lpTaskId}
                >
                  {l(C.wzNext)}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── History strip ─────────────────────────────────────────────────────────────

interface OcHistoryProps {
  records:      readonly OcRecord[];
  tasks:        readonly OcTask[];
  locale:       string;
  canApprove:   boolean;
  reviewerName: string;
  onApprove:    (recordId: string) => void;
  onReject:     (recordId: string, reason: string) => void;
}

function OcHistory({ records, tasks, locale, canApprove: hasApprove, reviewerName, onApprove, onReject }: OcHistoryProps): React.ReactElement {
  const l = (b: L10n<string>) => t(b, locale);

  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const taskMap = useMemo(
    () => new Map(tasks.map((tk) => [tk.id, tk])),
    [tasks],
  );

  const sorted = useMemo(
    () => [...records].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).slice(0, 20),
    [records],
  );

  const rejectingRecord = rejectingId ? records.find((r) => r.id === rejectingId) ?? null : null;

  return (
    <section className="oc-history" aria-labelledby="oc-history-heading">
      <h2 id="oc-history-heading" className="oc-history__title">{l(C.histTitle)}</h2>

      {rejectingRecord && (
        <RejectDialog
          record={rejectingRecord}
          reviewerName={reviewerName}
          locale={locale}
          onConfirm={(reason) => {
            onReject(rejectingId!, reason);
            setRejectingId(null);
          }}
          onCancel={() => setRejectingId(null)}
        />
      )}

      {sorted.length === 0 ? (
        <p className="oc-history__empty">{l(C.histEmpty)}</p>
      ) : (
        <div className="ur-table-wrap">
          <table className="ur-table oc-hist-table">
            <thead>
              <tr>
                <th>{l(C.histLp)}</th>
                <th>{l(C.colEquipment)}</th>
                <th>{l(C.histPerformed)}</th>
                <th>{l(C.histQty)}</th>
                <th>{l(C.wz2OilType)}</th>
                <th>{l(C.histTech)}</th>
                <th>{l(C.histStatus)}</th>
                {hasApprove && <th>{l(C.histActions)}</th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const task = taskMap.get(r.taskId);
                const rsc  = recordStatusChip(r.status);
                return (
                  <tr key={r.id}>
                    <td><span className="ur-badge ur-badge--sm">{r.lpId}</span></td>
                    <td>
                      <div className="oc-task-row__equip-name">{r.equipmentName}</div>
                      {task && <div className="oc-task-row__equip-id">{task.area}</div>}
                    </td>
                    <td className="ur-table__date">{fmtDate(r.performedAt)}</td>
                    <td>{r.quantityUsed} {l(C.dpLitres)}</td>
                    <td className="oc-task-row__oil">{r.oilTypeUsed}</td>
                    <td>{r.technicianName}</td>
                    <td>
                      <StatusChip status={rsc.chip} label={l(rsc.label)} />
                      {r.rejectionReason && (
                        <div className="oc-hist-reject-reason" title={r.rejectionReason}>
                          {r.rejectionReason.length > 40 ? r.rejectionReason.slice(0, 40) + '…' : r.rejectionReason}
                        </div>
                      )}
                    </td>
                    {hasApprove && (
                      <td>
                        {r.status === 'pending-approval' && (
                          <div className="ur-action-group">
                            <button
                              className="ur-btn ur-btn--sm oc-approval-actions__approve-btn"
                              onClick={() => onApprove(r.id)}
                            >
                              {l(C.dpApprove)}
                            </button>
                            <button
                              className="ur-btn ur-btn--ghost ur-btn--sm oc-approval-actions__reject-btn"
                              onClick={() => setRejectingId(r.id)}
                            >
                              {l(C.dpReject)}
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ── Main OilChangeCenter ──────────────────────────────────────────────────────

export default function OilChangeCenter(): React.ReactElement {
  const { locale } = useLanguage();
  const { user }   = useAuth();
  const l = (b: L10n<string>) => t(b, locale);

  // Resolve role and permissions
  const userRole   = resolveRole((user?.roles as string[] | undefined)?.[0]);
  const userCanApprove = canApprove(userRole);
  const userCanSubmit  = canSubmit(userRole);

  // Default technician name from auth user
  const defaultTechName = user?.displayName ?? user?.email ?? '';

  // Reviewer name for approval/rejection audit
  const reviewerName = user?.displayName ?? user?.email ?? 'Unknown Reviewer';

  // ── State ──────────────────────────────────────────────────────────────────
  const [tasks,   setTasks]   = useState<readonly OcTask[]>(() => oilChangeService.listTasks());
  const [records, setRecords] = useState<readonly OcRecord[]>(() => oilChangeService.listRecords());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [search,  setSearch]  = useState('');
  const [filters, setFilters] = useState<OcFilters>(DEFAULT_FILTERS);

  // ── Derived options ────────────────────────────────────────────────────────
  const contractors = useMemo(() => distinct(tasks.map((t) => t.contractorId)), [tasks]);
  const areas       = useMemo(() => distinct(tasks.map((t) => t.area)), [tasks]);
  const oilTypes    = useMemo(() => distinct(tasks.map((t) => t.oilType)), [tasks]);

  // ── Filtered task list ─────────────────────────────────────────────────────
  const visibleTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (q) {
        const match =
          task.lpId.toLowerCase().includes(q) ||
          task.equipmentId.toLowerCase().includes(q) ||
          task.equipmentName.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filters.status) {
        if (filters.status === 'scheduled') {
          if (task.status !== 'scheduled' && task.status !== 'due-soon' && task.status !== 'ok') return false;
        } else {
          if (task.status !== filters.status) return false;
        }
      }
      if (filters.contractor && task.contractorId !== filters.contractor) return false;
      if (filters.area       && task.area         !== filters.area)       return false;
      if (filters.oilType    && task.oilType       !== filters.oilType)   return false;
      return true;
    });
  }, [tasks, search, filters]);

  // ── Selected task ──────────────────────────────────────────────────────────
  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedId) ?? null,
    [tasks, selectedId],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleOpenWizard = useCallback(() => {
    setWizardOpen(true);
  }, []);

  const handleCloseWizard = useCallback(() => {
    setWizardOpen(false);
  }, []);

  const handleRecordAnother = useCallback(() => {
    setWizardOpen(false);
    // Brief delay then re-open so the form resets cleanly
    setTimeout(() => setWizardOpen(true), 50);
  }, []);

  const handleSubmit = useCallback((newRecord: OcRecord, updatedTask: OcTask) => {
    setRecords(oilChangeService.listRecords());
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    if (selectedId === updatedTask.id) {
      setSelectedId(updatedTask.id);
    }
  }, [selectedId]);

  // Approval handler
  const handleApprove = useCallback((recordId: string) => {
    try {
      const { task: updatedTask, record: updatedRecord } = oilChangeService.approveRecord(recordId, reviewerName);
      setRecords(oilChangeService.listRecords());
      setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
      void updatedRecord;
    } catch (err) {
      console.error('Approve error', err);
    }
  }, [reviewerName]);

  // Reject handler
  const handleReject = useCallback((recordId: string, reason: string) => {
    try {
      const { task: updatedTask, record: updatedRecord } = oilChangeService.rejectRecord(recordId, reason, reviewerName);
      setRecords(oilChangeService.listRecords());
      setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
      void updatedRecord;
    } catch (err) {
      console.error('Reject error', err);
    }
  }, [reviewerName]);

  // ── Layout: task list + detail panel ──────────────────────────────────────
  const hasDetail = selectedTask !== null;

  return (
    <div className="ur-page oc-page">

      {/* ── Page header ── */}
      <div className="ur-page__header">
        <div className="ur-page__header-text">
          <h1 className="ur-page__title">{l(C.pageTitle)}</h1>
          <p className="ur-page__desc">{l(C.pageDesc)}</p>
        </div>
        <StatusChip status="operational" label={l(C.liveData)} className="ur-page__sdk-badge" />
      </div>

      {/* ── KPI strip ── */}
      <OcKpis tasks={tasks} records={records} locale={locale} />

      {/* ── Toolbar ── */}
      <OcToolbar
        search={search}
        filters={filters}
        contractors={contractors}
        areas={areas}
        oilTypes={oilTypes}
        onSearch={setSearch}
        onFilters={setFilters}
        onRecord={handleOpenWizard}
        locale={locale}
        canSubmitRecord={userCanSubmit}
      />

      {/* ── Main workspace ── */}
      <div className={`oc-workspace ${hasDetail ? 'oc-workspace--split' : ''}`}>

        {/* Task list */}
        <div className="oc-workspace__list">
          <OcTaskList
            tasks={visibleTasks}
            selectedId={selectedId}
            onSelect={handleSelect}
            locale={locale}
          />
          {!hasDetail && visibleTasks.length > 0 && (
            <p className="oc-workspace__hint">{l(C.selectRow)}</p>
          )}
        </div>

        {/* Detail panel */}
        {hasDetail && (
          <OcDetailPanel
            task={selectedTask}
            records={records}
            onClose={() => setSelectedId(null)}
            onRecord={handleOpenWizard}
            onApprove={handleApprove}
            onReject={handleReject}
            locale={locale}
            canApprove={userCanApprove}
            reviewerName={reviewerName}
          />
        )}

      </div>

      {/* ── History strip ── */}
      <OcHistory
        records={records}
        tasks={tasks}
        locale={locale}
        canApprove={userCanApprove}
        reviewerName={reviewerName}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* ── 3-Step wizard ── */}
      <OcWizard
        open={wizardOpen}
        allTasks={tasks}
        initialTask={selectedTask}
        onClose={handleCloseWizard}
        onSubmit={handleSubmit}
        onRecordAnother={handleRecordAnother}
        locale={locale}
        defaultTechName={defaultTechName}
      />

    </div>
  );
}
