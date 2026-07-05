// apps/owner-center/src/modules/oil-analysis/report-catalog.ts
// OA-008 — report template catalog, categories, and favorites.

export type OilReportCategory =
  | 'operational'
  | 'condition'
  | 'engineering'
  | 'management'
  | 'compliance';

export type OilReportType =
  | 'sample-summary'
  | 'samples-by-period'
  | 'pending-reviews'
  | 'pending-approvals'
  | 'alert-equipment'
  | 'caution-equipment'
  | 'normal-equipment'
  | 'critical-equipment'
  | 'equipment-history'
  | 'lp-history'
  | 'oil-type-history'
  | 'contractor-performance'
  | 'kpi-summary'
  | 'monthly-summary'
  | 'area-summary'
  | 'contractor-comparison'
  | 'sampling-compliance'
  | 'overdue-sampling'
  | 'oil-change-compliance'
  | 'missing-samples';

export interface OilReportTemplateDef {
  readonly id: OilReportType;
  readonly category: OilReportCategory;
  readonly labelEn: string;
  readonly labelAr: string;
  readonly descriptionEn: string;
  readonly descriptionAr: string;
  /** Hidden for contractor-scoped users (ACC-only comparison reports). */
  readonly accOnly?: boolean;
}

export const OIL_REPORT_CATEGORIES: readonly {
  id: OilReportCategory;
  labelEn: string;
  labelAr: string;
}[] = [
  { id: 'operational', labelEn: 'Operational', labelAr: 'تشغيلي' },
  { id: 'condition', labelEn: 'Condition', labelAr: 'الحالة' },
  { id: 'engineering', labelEn: 'Engineering', labelAr: 'هندسي' },
  { id: 'management', labelEn: 'Management', labelAr: 'إداري' },
  { id: 'compliance', labelEn: 'Compliance', labelAr: 'الامتثال' },
] as const;

export const OIL_REPORT_TEMPLATES: readonly OilReportTemplateDef[] = [
  {
    id: 'sample-summary',
    category: 'operational',
    labelEn: 'Sample Summary',
    labelAr: 'ملخص العينات',
    descriptionEn: 'Approved sample counts by equipment, area, contractor, and condition.',
    descriptionAr: 'أعداد العينات المعتمدة حسب المعدة والمنطقة والمقاول والحالة.',
  },
  {
    id: 'samples-by-period',
    category: 'operational',
    labelEn: 'Samples by Period',
    labelAr: 'العينات حسب الفترة',
    descriptionEn: 'Monthly sample volume within the selected date range.',
    descriptionAr: 'حجم العينات الشهري ضمن نطاق التاريخ المحدد.',
  },
  {
    id: 'pending-reviews',
    category: 'operational',
    labelEn: 'Pending Reviews',
    labelAr: 'بانتظار المراجعة',
    descriptionEn: 'Samples awaiting engineer intake, LP mapping, or PDF review.',
    descriptionAr: 'عينات بانتظار الإدخال أو ربط نقطة التشحيم أو مراجعة PDF.',
  },
  {
    id: 'pending-approvals',
    category: 'operational',
    labelEn: 'Pending Approvals',
    labelAr: 'بانتظار الاعتماد',
    descriptionEn: 'Analysed samples awaiting engineer approval.',
    descriptionAr: 'عينات محللة بانتظار اعتماد المهندس.',
  },
  {
    id: 'alert-equipment',
    category: 'condition',
    labelEn: 'Alert Equipment',
    labelAr: 'معدات تنبيه',
    descriptionEn: 'Lubrication points in alert condition based on latest sample.',
    descriptionAr: 'نقاط التشحيم في حالة تنبيه وفق أحدث عينة.',
  },
  {
    id: 'caution-equipment',
    category: 'condition',
    labelEn: 'Caution Equipment',
    labelAr: 'معدات حذر',
    descriptionEn: 'Lubrication points in caution or monitor condition.',
    descriptionAr: 'نقاط التشحيم في حالة حذر أو مراقبة.',
  },
  {
    id: 'normal-equipment',
    category: 'condition',
    labelEn: 'Normal Equipment',
    labelAr: 'معدات طبيعية',
    descriptionEn: 'Lubrication points with normal oil health status.',
    descriptionAr: 'نقاط التشحيم ذات حالة زيت طبيعية.',
  },
  {
    id: 'critical-equipment',
    category: 'condition',
    labelEn: 'Critical Equipment',
    labelAr: 'معدات حرجة',
    descriptionEn: 'Equipment with critical sample results or shutdown alerts.',
    descriptionAr: 'معدات ذات نتائج حرجة أو تنبيهات إيقاف.',
  },
  {
    id: 'equipment-history',
    category: 'engineering',
    labelEn: 'Equipment History',
    labelAr: 'سجل المعدة',
    descriptionEn: 'Chronological approved sample history for equipment in scope.',
    descriptionAr: 'سجل العينات المعتمدة زمنياً للمعدات ضمن النطاق.',
  },
  {
    id: 'lp-history',
    category: 'engineering',
    labelEn: 'LP History',
    labelAr: 'سجل نقطة التشحيم',
    descriptionEn: 'Sample history per lubrication point.',
    descriptionAr: 'سجل العينات لكل نقطة تشحيم.',
  },
  {
    id: 'oil-type-history',
    category: 'engineering',
    labelEn: 'Oil Type History',
    labelAr: 'سجل نوع الزيت',
    descriptionEn: 'Samples grouped by oil type and lubricant specification.',
    descriptionAr: 'العينات مجمعة حسب نوع الزيت والمواصفة.',
  },
  {
    id: 'contractor-performance',
    category: 'engineering',
    labelEn: 'Contractor Performance',
    labelAr: 'أداء المقاول',
    descriptionEn: 'Sampling compliance and condition metrics by contractor.',
    descriptionAr: 'امتثال أخذ العينات ومقاييس الحالة حسب المقاول.',
  },
  {
    id: 'kpi-summary',
    category: 'management',
    labelEn: 'KPI Summary',
    labelAr: 'ملخص مؤشرات الأداء',
    descriptionEn: 'Executive KPI snapshot for oil analysis operations.',
    descriptionAr: 'لمحة تنفيذية لمؤشرات تشغيل تحليل الزيت.',
  },
  {
    id: 'monthly-summary',
    category: 'management',
    labelEn: 'Monthly Summary',
    labelAr: 'ملخص شهري',
    descriptionEn: 'Month-by-month operational summary.',
    descriptionAr: 'ملخص تشغيلي شهر بشهر.',
  },
  {
    id: 'area-summary',
    category: 'management',
    labelEn: 'Area Summary',
    labelAr: 'ملخص المنطقة',
    descriptionEn: 'Condition and sampling metrics by plant area.',
    descriptionAr: 'مقاييس الحالة وأخذ العينات حسب منطقة المصنع.',
  },
  {
    id: 'contractor-comparison',
    category: 'management',
    labelEn: 'Contractor Comparison',
    labelAr: 'مقارنة المقاولين',
    descriptionEn: 'Side-by-side contractor health and compliance comparison.',
    descriptionAr: 'مقارنة صحة الامتثال بين المقاولين.',
    accOnly: true,
  },
  {
    id: 'sampling-compliance',
    category: 'compliance',
    labelEn: 'Sampling Compliance',
    labelAr: 'امتثال أخذ العينات',
    descriptionEn: 'LPs with on-time sampling within the compliance window.',
    descriptionAr: 'نقاط التشحيم التي التزمت بمواعيد أخذ العينات.',
  },
  {
    id: 'overdue-sampling',
    category: 'compliance',
    labelEn: 'Overdue Sampling',
    labelAr: 'عينات متأخرة',
    descriptionEn: 'Lubrication points past their next sample due date.',
    descriptionAr: 'نقاط التشحيم التي تجاوزت موعد العينة القادمة.',
  },
  {
    id: 'oil-change-compliance',
    category: 'compliance',
    labelEn: 'Oil Change Compliance',
    labelAr: 'امتثال تغيير الزيت',
    descriptionEn: 'Oil change task status and overdue changes.',
    descriptionAr: 'حالة مهام تغيير الزيت والتغييرات المتأخرة.',
  },
  {
    id: 'missing-samples',
    category: 'compliance',
    labelEn: 'Missing Samples',
    labelAr: 'عينات مفقودة',
    descriptionEn: 'Active LPs with no oil analysis sample on record.',
    descriptionAr: 'نقاط تشحيم نشطة بدون عينة تحليل زيت مسجلة.',
  },
] as const;

const FAVORITES_STORAGE_KEY = 'acc.oil-analysis.report-favorites';

function readFavoritesRaw(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

export function getReportFavorites(): OilReportType[] {
  const valid = new Set(OIL_REPORT_TEMPLATES.map((t) => t.id));
  return readFavoritesRaw().filter((id): id is OilReportType => valid.has(id as OilReportType));
}

export function toggleReportFavorite(reportType: OilReportType): OilReportType[] {
  const current = getReportFavorites();
  const next = current.includes(reportType)
    ? current.filter((id) => id !== reportType)
    : [...current, reportType];
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function templateLabel(
  template: OilReportTemplateDef,
  locale: string,
): { title: string; description: string } {
  const isAr = locale === 'ar';
  return {
    title: isAr ? template.labelAr : template.labelEn,
    description: isAr ? template.descriptionAr : template.descriptionEn,
  };
}

export function templatesForCategory(
  category: OilReportCategory,
  canViewAllContractors: boolean,
): readonly OilReportTemplateDef[] {
  return OIL_REPORT_TEMPLATES.filter((t) => {
    if (t.category !== category) return false;
    if (t.accOnly && !canViewAllContractors) return false;
    return true;
  });
}

export function findReportTemplate(id: OilReportType): OilReportTemplateDef | undefined {
  return OIL_REPORT_TEMPLATES.find((t) => t.id === id);
}
