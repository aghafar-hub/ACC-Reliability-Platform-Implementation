// Platform Engineering Actions — cross-module action center (all sources).

import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { usePlatformSdk } from '../context/SdkContext';
import {
  CardList,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  KpiCard,
  KpiGrid,
  PageHeader,
  StatusBadge,
  useIsMobile,
} from '../components/ui';
import type { DataTableColumn, FilterFieldConfig, StatusBadgeVariant } from '../components/ui';
import { resolveOilAnalysisContractorScope } from '../modules/oil-analysis/contractor-scope';
import {
  engineeringActionService,
  type EngineeringActionFilterParams,
} from '../modules/platform/engineering-actions/engineering-action.service';
import type { EngineeringAction } from '../modules/platform/engineering-actions/engineering-action-types';
import {
  ENGINEERING_ACTION_PRIORITIES,
  ENGINEERING_ACTION_SOURCES,
  ENGINEERING_ACTION_STATUSES,
} from '../modules/platform/engineering-actions/engineering-action-types';
import {
  actionStatusBadge,
  priorityBadgeVariant,
} from '../modules/platform/engineering-actions/action-status';

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return '—';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale === 'ar' ? 'ar-SA' : undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const COPY = {
  title: { en: 'Engineering Actions', ar: 'إجراءات الهندسة' },
  subtitle: {
    en: 'Platform-wide corrective and investigative actions across all reliability modules.',
    ar: 'إجراءات تصحيحية وتحقيقية على مستوى المنصة عبر جميع وحدات الموثوقية.',
  },
  search: { en: 'Search action, LP, equipment, source…', ar: 'بحث…' },
  filterSource: { en: 'Source', ar: 'المصدر' },
  filterLp: { en: 'LP_ID', ar: 'LP_ID' },
  filterStatus: { en: 'Status', ar: 'الحالة' },
  filterPriority: { en: 'Priority', ar: 'الأولوية' },
  filterAll: { en: 'All', ar: 'الكل' },
  clearFilters: { en: 'Clear filters', ar: 'مسح الفلاتر' },
  colActionNo: { en: 'Action No.', ar: 'رقم الإجراء' },
  colSource: { en: 'Source', ar: 'المصدر' },
  colLp: { en: 'LP_ID', ar: 'LP_ID' },
  colEquipment: { en: 'Equipment Name', ar: 'اسم المعدة' },
  colStatus: { en: 'Status', ar: 'الحالة' },
  colPriority: { en: 'Priority', ar: 'الأولوية' },
  colDue: { en: 'Due Date', ar: 'تاريخ الاستحقاق' },
  emptyTitle: { en: 'No engineering actions found', ar: 'لم يتم العثور على إجراءات' },
  emptyDesc: { en: 'Actions created from Oil Analysis, Vibration, and other modules appear here.', ar: 'تظهر الإجراءات من تحليل الزيت والاهتزاز والوحدات الأخرى هنا.' },
  kpiTotal: { en: 'Latest per LP', ar: 'أحدث لكل نقطة' },
  kpiOpen: { en: 'Open', ar: 'مفتوحة' },
  kpiCritical: { en: 'Critical', ar: 'حرجة' },
  kpiOverdue: { en: 'Overdue', ar: 'متأخرة' },
} as const;

function applyScopeFilter(
  scope: ReturnType<typeof resolveOilAnalysisContractorScope>,
  rows: readonly EngineeringAction[],
): readonly EngineeringAction[] {
  if (scope.canViewAllContractors) return rows;
  return rows.filter((row) => row.contractorId === scope.lockedContractorId);
}

export default function EngineeringActionsPage(): React.ReactElement {
  const { locale } = useLanguage();
  const l = useCallback((bundle: L10n<string>) => t(bundle, locale), [locale]);
  const sdk = usePlatformSdk();
  const { status: authStatus } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const [lpId, setLpId] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);

  const contractorScope = useMemo(
    () => resolveOilAnalysisContractorScope(sdk),
    [sdk],
  );

  const filterParams: EngineeringActionFilterParams = useMemo(
    () => ({
      search,
      source: (source || undefined) as EngineeringActionFilterParams['source'],
      lpId: lpId || undefined,
      status: (status || undefined) as EngineeringActionFilterParams['status'],
      priority: (priority || undefined) as EngineeringActionFilterParams['priority'],
      contractorId: contractorScope.canViewAllContractors
        ? undefined
        : contractorScope.lockedContractorId,
    }),
    [contractorScope, lpId, priority, search, source, status],
  );

  const pageData = useMemo(() => {
    if (authStatus !== 'authenticated') {
      return { rows: [] as EngineeringAction[], kpis: { total: 0, open: 0, critical: 0, overdue: 0, pendingAccReview: 0 }, error: null as string | null };
    }
    try {
      const rows = applyScopeFilter(
        contractorScope,
        engineeringActionService.listLatestByLp(filterParams),
      );
      const meta = engineeringActionService.computeListMeta(filterParams);
      return { rows, kpis: meta.kpis, error: null as string | null };
    } catch (err) {
      return {
        rows: [] as EngineeringAction[],
        kpis: { total: 0, open: 0, critical: 0, overdue: 0, pendingAccReview: 0 },
        error: err instanceof Error ? err.message : 'Load failed',
      };
    }
  }, [authStatus, contractorScope, filterParams, reloadNonce]);

  const filters: FilterFieldConfig[] = useMemo(
    () => [
      {
        id: 'source',
        label: l(COPY.filterSource),
        type: 'select',
        value: source,
        placeholder: l(COPY.filterAll),
        options: ENGINEERING_ACTION_SOURCES.map((value) => ({ value, label: value })),
      },
      {
        id: 'lpId',
        label: l(COPY.filterLp),
        type: 'select',
        value: lpId,
        placeholder: l(COPY.filterAll),
        options: [...new Set(pageData.rows.map((r) => r.lpId))].map((value) => ({ value, label: value })),
      },
      {
        id: 'status',
        label: l(COPY.filterStatus),
        type: 'select',
        value: status,
        placeholder: l(COPY.filterAll),
        options: ENGINEERING_ACTION_STATUSES.map((value) => ({ value, label: value })),
      },
      {
        id: 'priority',
        label: l(COPY.filterPriority),
        type: 'select',
        value: priority,
        placeholder: l(COPY.filterAll),
        options: ENGINEERING_ACTION_PRIORITIES.map((value) => ({ value, label: value })),
      },
    ],
    [l, lpId, pageData.rows, priority, source, status],
  );

  const openAction = (row: EngineeringAction): void => {
    if (row.source === 'Oil Analysis') {
      navigate(`/oil-analysis/actions/${encodeURIComponent(row.id)}`);
    }
  };

  const columns: DataTableColumn<EngineeringAction>[] = useMemo(
    () => [
      { id: 'actionNo', header: l(COPY.colActionNo), accessor: 'actionNo', sortable: true, sticky: true },
      { id: 'source', header: l(COPY.colSource), accessor: 'source', sortable: true },
      { id: 'lpId', header: l(COPY.colLp), accessor: 'lpId', sortable: true },
      { id: 'equipmentName', header: l(COPY.colEquipment), accessor: 'equipmentName', sortable: true },
      {
        id: 'priority',
        header: l(COPY.colPriority),
        renderCell: (row) => (
          <StatusBadge variant={priorityBadgeVariant(row.priority) as StatusBadgeVariant} label={row.priority} size="sm" />
        ),
      },
      {
        id: 'status',
        header: l(COPY.colStatus),
        renderCell: (row) => {
          const badge = actionStatusBadge(row.status);
          return <StatusBadge variant={badge.variant as StatusBadgeVariant} label={badge.label} size="sm" />;
        },
      },
      { id: 'dueDate', header: l(COPY.colDue), accessor: (row) => formatDate(row.dueDate, locale) },
    ],
    [l, locale],
  );

  if (pageData.error) {
    return (
      <ErrorState
        message={pageData.error}
        onRetry={() => setReloadNonce((n) => n + 1)}
        className="acc-oa-page"
      />
    );
  }

  const { rows, kpis } = pageData;

  return (
    <div className="acc-oa-page acc-oa-actions">
      <PageHeader title={l(COPY.title)} subtitle={l(COPY.subtitle)} />

      <KpiGrid desktopColumns={6}>
        <KpiCard value={kpis.total} label={l(COPY.kpiTotal)} severity="info" />
        <KpiCard value={kpis.open} label={l(COPY.kpiOpen)} severity="caution" />
        <KpiCard value={kpis.critical} label={l(COPY.kpiCritical)} severity="critical" />
        <KpiCard value={kpis.overdue} label={l(COPY.kpiOverdue)} severity="alert" />
      </KpiGrid>

      <FilterBar
        searchValue={search}
        searchPlaceholder={l(COPY.search)}
        onSearchChange={setSearch}
        filters={filters}
        onFilterChange={(id, value) => {
          if (id === 'source') setSource(value);
          if (id === 'lpId') setLpId(value);
          if (id === 'status') setStatus(value);
          if (id === 'priority') setPriority(value);
        }}
        onClear={() => {
          setSearch('');
          setSource('');
          setLpId('');
          setStatus('');
          setPriority('');
        }}
        clearLabel={l(COPY.clearFilters)}
        activeFilterCount={[source, lpId, status, priority].filter(Boolean).length}
      />

      {rows.length === 0 ? (
        <EmptyState title={l(COPY.emptyTitle)} description={l(COPY.emptyDesc)} />
      ) : isMobile ? (
        <CardList
          items={[...rows]}
          fields={[
            { id: 'actionNo', label: l(COPY.colActionNo), render: (row) => row.actionNo, emphasize: true },
            { id: 'source', label: l(COPY.colSource), render: (row) => row.source },
            { id: 'lp', label: l(COPY.colLp), render: (row) => row.lpId },
            { id: 'equipment', label: l(COPY.colEquipment), render: (row) => row.equipmentName },
          ]}
          getStatus={(row) => {
            const badge = actionStatusBadge(row.status);
            return { variant: badge.variant as StatusBadgeVariant, label: badge.label };
          }}
          onItemClick={(row) => openAction(row)}
          emptyTitle={l(COPY.emptyTitle)}
          emptyDescription={l(COPY.emptyDesc)}
        />
      ) : (
        <DataTable
          columns={columns}
          data={[...rows]}
          onRowClick={(row) => openAction(row)}
          emptyTitle={l(COPY.emptyTitle)}
          emptyDescription={l(COPY.emptyDesc)}
          stickyHeader
        />
      )}
    </div>
  );
}
