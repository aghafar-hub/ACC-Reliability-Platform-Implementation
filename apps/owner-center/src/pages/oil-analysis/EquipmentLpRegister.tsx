// apps/owner-center/src/pages/oil-analysis/EquipmentLpRegister.tsx
// OA-001 Equipment & LP Register — contractor-scoped LP list with oil analysis status.

import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { usePlatformSdk } from '../../context/SdkContext';
import { useAuth } from '../../context/AuthContext';
import {
  CardList,
  DataTable,
  ErrorState,
  FilterBar,
  KpiCard,
  KpiGrid,
  PageHeader,
  StatusBadge,
  useIsMobile,
} from '../../components/ui';
import type { DataTableColumn, FilterFieldConfig, StatusBadgeVariant } from '../../components/ui';
import { resolveOilAnalysisContractorScope } from '../../modules/oil-analysis/contractor-scope';
import {
  lpRegisterService,
  registerStatusBadge,
} from '../../modules/oil-analysis/lp-register.service';
import type { LpRegisterRow } from '../../modules/oil-analysis/lp-register.service';

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

const COPY = {
  title: { en: 'Equipment & LP Register', ar: 'سجل المعدات ونقاط التشحيم' },
  subtitle: {
    en: 'Contractor-scoped lubrication points with current oil analysis condition.',
    ar: 'نقاط التشحيم ضمن نطاق المقاول مع حالة تحليل الزيت الحالية.',
  },
  search: { en: 'Search LP, equipment, area…', ar: 'ابحث عن نقطة التشحيم أو المعدة أو المنطقة…' },
  filterLp: { en: 'LP_ID', ar: 'LP_ID' },
  filterArea: { en: 'Area', ar: 'المنطقة' },
  filterContractor: { en: 'Contractor', ar: 'المقاول' },
  filterSamplingDate: { en: 'Sampling date', ar: 'تاريخ أخذ العينة' },
  filterStatus: { en: 'Status', ar: 'الحالة' },
  filterAll: { en: 'All', ar: 'الكل' },
  clearFilters: { en: 'Clear filters', ar: 'مسح الفلاتر' },
  colLp: { en: 'LP_ID', ar: 'LP_ID' },
  colEquipment: { en: 'Equipment Name', ar: 'اسم المعدة' },
  colLastSample: { en: 'Last Sample', ar: 'آخر عينة' },
  colNextSample: { en: 'Next Sample', ar: 'العينة القادمة' },
  colStatus: { en: 'Last Sample Status', ar: 'حالة آخر عينة' },
  emptyTitle: { en: 'No lubrication points found', ar: 'لم يتم العثور على نقاط تشحيم' },
  emptyDesc: {
    en: 'Adjust filters or register lubrication points in the platform master.',
    ar: 'عدّل الفلاتر أو سجّل نقاط التشحيم في السجل الرئيسي للمنصة.',
  },
  errorLoad: { en: 'Unable to load the register.', ar: 'تعذر تحميل السجل.' },
  kpiTotal: { en: 'Total LPs', ar: 'إجمالي نقاط التشحيم' },
  kpiNormal: { en: 'Normal', ar: 'طبيعي' },
  kpiCaution: { en: 'Caution', ar: 'حذر' },
  kpiAlert: { en: 'Alert', ar: 'تنبيه' },
  kpiOverdue: { en: 'Overdue sample', ar: 'عينة متأخرة' },
  statusNormal: { en: 'Normal', ar: 'طبيعي' },
  statusCaution: { en: 'Caution', ar: 'حذر' },
  statusAlert: { en: 'Alert', ar: 'تنبيه' },
  statusPending: { en: 'Pending', ar: 'قيد الانتظار' },
  statusNone: { en: 'No sample', ar: 'لا توجد عينة' },
  statusOverdue: { en: 'Overdue', ar: 'متأخر' },
} as const;

const STATUS_FILTER_OPTIONS: ReadonlyArray<{ value: string; label: L10n<string> }> = [
  { value: 'normal', label: COPY.statusNormal },
  { value: 'caution', label: COPY.statusCaution },
  { value: 'alert', label: COPY.statusAlert },
  { value: 'pending', label: COPY.statusPending },
  { value: 'none', label: COPY.statusNone },
  { value: 'overdue', label: COPY.statusOverdue },
];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusLabel(
  status: LpRegisterRow['lastSampleStatus'],
  locale: string,
): string {
  const map: Record<LpRegisterRow['lastSampleStatus'], L10n<string>> = {
    normal: COPY.statusNormal,
    caution: COPY.statusCaution,
    alert: COPY.statusAlert,
    pending: COPY.statusPending,
    none: COPY.statusNone,
  };
  return t(map[status], locale);
}

export default function EquipmentLpRegister(): React.ReactElement {
  const { locale } = useLanguage();
  const l = useCallback((bundle: L10n<string>) => t(bundle, locale), [locale]);
  const sdk = usePlatformSdk();
  const { status: authStatus } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [search, setSearch] = useState('');
  const [lpId, setLpId] = useState('');
  const [area, setArea] = useState('');
  const [contractor, setContractor] = useState('');
  const [samplingDate, setSamplingDate] = useState('');
  const [status, setStatus] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);

  const contractorScope = useMemo(
    () => resolveOilAnalysisContractorScope(sdk),
    [sdk],
  );

  const filterParams = useMemo(
    () => ({
      search,
      lpId: lpId || undefined,
      area: area || undefined,
      contractor: contractor || undefined,
      samplingDate: samplingDate || undefined,
      status: status || undefined,
    }),
    [search, lpId, area, contractor, samplingDate, status],
  );

  const registerData = useMemo(() => {
    if (authStatus !== 'authenticated') {
      return {
        rows: [] as LpRegisterRow[],
        filterOptions: { lpIds: [] as string[], areas: [] as string[], contractors: [] as string[] },
        kpis: lpRegisterService.computeKpis([]),
        error: null as string | null,
      };
    }
    try {
      const scopedRows = lpRegisterService.list(contractorScope, filterParams);
      return {
        rows: scopedRows,
        filterOptions: lpRegisterService.getFilterOptions(contractorScope),
        kpis: lpRegisterService.computeKpis(scopedRows),
        error: null as string | null,
      };
    } catch (err) {
      return {
        rows: [] as LpRegisterRow[],
        filterOptions: { lpIds: [] as string[], areas: [] as string[], contractors: [] as string[] },
        kpis: lpRegisterService.computeKpis([]),
        error: err instanceof Error ? err.message : 'Load failed',
      };
    }
  }, [authStatus, contractorScope, filterParams, reloadNonce]);

  const { rows, filterOptions, kpis } = registerData;

  const activeFilterCount = [lpId, area, contractor, samplingDate, status].filter(Boolean).length;

  const filters: FilterFieldConfig[] = useMemo(() => {
    const fields: FilterFieldConfig[] = [
      {
        id: 'lpId',
        label: l(COPY.filterLp),
        type: 'select',
        value: lpId,
        placeholder: l(COPY.filterAll),
        options: filterOptions.lpIds.map((value) => ({ value, label: value })),
      },
      {
        id: 'area',
        label: l(COPY.filterArea),
        type: 'select',
        value: area,
        placeholder: l(COPY.filterAll),
        options: filterOptions.areas.map((value) => ({ value, label: value })),
      },
      {
        id: 'samplingDate',
        label: l(COPY.filterSamplingDate),
        type: 'date',
        value: samplingDate,
      },
      {
        id: 'status',
        label: l(COPY.filterStatus),
        type: 'select',
        value: status,
        placeholder: l(COPY.filterAll),
        options: STATUS_FILTER_OPTIONS.map((opt) => ({
          value: opt.value,
          label: l(opt.label),
        })),
      },
    ];

    if (contractorScope.canViewAllContractors) {
      fields.splice(2, 0, {
        id: 'contractor',
        label: l(COPY.filterContractor),
        type: 'select',
        value: contractor,
        placeholder: l(COPY.filterAll),
        options: filterOptions.contractors.map((value) => ({ value, label: value })),
      });
    }

    return fields;
  }, [area, contractor, contractorScope.canViewAllContractors, filterOptions, l, lpId, samplingDate, status]);

  const handleClearFilters = (): void => {
    setSearch('');
    setLpId('');
    setArea('');
    if (contractorScope.canViewAllContractors) setContractor('');
    setSamplingDate('');
    setStatus('');
  };

  const openEquipmentDetails = (row: LpRegisterRow): void => {
    const qs = row.lpId ? `?lp=${encodeURIComponent(row.lpId)}` : '';
    navigate(`/oil-analysis/equipment/${encodeURIComponent(row.equipmentId)}${qs}`);
  };

  const openSampleReport = (row: LpRegisterRow, event?: React.MouseEvent): void => {
    event?.stopPropagation();
    const params = new URLSearchParams({
      equipment: row.equipmentId,
      lp: row.lpId,
    });
    navigate(`/oil-analysis/sample-report?${params.toString()}`);
  };

  const renderStatusBadge = (row: LpRegisterRow): React.ReactElement => {
    const badge = registerStatusBadge(row.lastSampleStatus);
    return (
      <StatusBadge
        variant={badge.variant as StatusBadgeVariant}
        label={statusLabel(row.lastSampleStatus, locale)}
        size="sm"
        onClick={() => openSampleReport(row)}
      />
    );
  };

  const columns: DataTableColumn<LpRegisterRow>[] = useMemo(
    () => [
      { id: 'lpId', header: l(COPY.colLp), accessor: 'lpId', sortable: true, sticky: true },
      {
        id: 'equipmentName',
        header: l(COPY.colEquipment),
        accessor: 'equipmentName',
        sortable: true,
      },
      {
        id: 'lastSample',
        header: l(COPY.colLastSample),
        accessor: (row) => formatDate(row.lastSampleDate),
        sortable: true,
      },
      {
        id: 'nextSample',
        header: l(COPY.colNextSample),
        renderCell: (row) => (
          <span className={row.isSampleOverdue ? 'acc-oa-register__overdue' : undefined}>
            {formatDate(row.nextSampleDate)}
          </span>
        ),
        sortable: true,
      },
      {
        id: 'status',
        header: l(COPY.colStatus),
        renderCell: (row) => renderStatusBadge(row),
      },
    ],
    [l, locale],
  );

  if (registerData.error) {
    return (
      <ErrorState
        message={registerData.error}
        onRetry={() => setReloadNonce((n) => n + 1)}
        className="acc-oa-page"
      />
    );
  }

  return (
    <div className="acc-oa-page">
      <PageHeader
        title={l(COPY.title)}
        subtitle={l(COPY.subtitle)}
        breadcrumbs={[
          { label: l({ en: 'Oil Analysis', ar: 'تحليل الزيت' }), href: '/oil-analysis' },
          { label: l(COPY.title) },
        ]}
      />

      <KpiGrid desktopColumns={6}>
        <KpiCard value={kpis.total} label={l(COPY.kpiTotal)} severity="info" />
        <KpiCard value={kpis.normal} label={l(COPY.kpiNormal)} severity="normal" />
        <KpiCard value={kpis.caution} label={l(COPY.kpiCaution)} severity="caution" />
        <KpiCard value={kpis.alert} label={l(COPY.kpiAlert)} severity="alert" />
        <KpiCard value={kpis.overdue} label={l(COPY.kpiOverdue)} severity="critical" />
      </KpiGrid>

      <FilterBar
        searchValue={search}
        searchPlaceholder={l(COPY.search)}
        onSearchChange={setSearch}
        filters={filters}
        onFilterChange={(id, value) => {
          if (id === 'lpId') setLpId(value);
          if (id === 'area') setArea(value);
          if (id === 'contractor') setContractor(value);
          if (id === 'samplingDate') setSamplingDate(value);
          if (id === 'status') setStatus(value);
        }}
        onClear={handleClearFilters}
        clearLabel={l(COPY.clearFilters)}
        activeFilterCount={activeFilterCount}
      />

      {isMobile ? (
        <CardList
          items={[...rows]}
          fields={[
            { id: 'lp', label: l(COPY.colLp), render: (row) => row.lpId, emphasize: true },
            { id: 'equipment', label: l(COPY.colEquipment), render: (row) => row.equipmentName },
            { id: 'last', label: l(COPY.colLastSample), render: (row) => formatDate(row.lastSampleDate) },
            {
              id: 'next',
              label: l(COPY.colNextSample),
              render: (row) => formatDate(row.nextSampleDate),
            },
          ]}
          getStatus={(row) => {
            const badge = registerStatusBadge(row.lastSampleStatus);
            return {
              variant: badge.variant as StatusBadgeVariant,
              label: statusLabel(row.lastSampleStatus, locale),
            };
          }}
          onItemClick={openEquipmentDetails}
          quickActions={(row) => (
            <button
              type="button"
              className="acc-btn acc-btn--ghost"
              onClick={(e) => openSampleReport(row, e)}
            >
              {l(COPY.colStatus)}
            </button>
          )}
          emptyTitle={l(COPY.emptyTitle)}
          emptyDescription={l(COPY.emptyDesc)}
        />
      ) : (
        <DataTable
          columns={columns}
          data={[...rows]}
          onRowClick={openEquipmentDetails}
          emptyTitle={l(COPY.emptyTitle)}
          emptyDescription={l(COPY.emptyDesc)}
          stickyHeader
        />
      )}
    </div>
  );
}
