// OA-005 — Oil Analysis Actions list (Source = Oil Analysis).

import React, { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { usePlatformSdk } from '../../context/SdkContext';
import {
  CardList,
  DataTable,
  Dialog,
  EmptyState,
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
  oilAnalysisActionsService,
  resolveCanSubmitFastAction,
  actionStatusBadge,
  priorityBadgeVariant,
  type OilAnalysisActionListRow,
} from '../../modules/oil-analysis/actions.service';
import {
  ACTION_TYPE_OPTIONS,
  ENGINEERING_ACTION_PRIORITIES,
  ENGINEERING_ACTION_STATUSES,
  type EngineeringActionPriority,
  type EngineeringActionStatus,
} from '../../modules/platform/engineering-actions/engineering-action-types';

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

function formatDateTime(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale === 'ar' ? 'ar-SA' : undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const COPY = {
  title: { en: 'Actions', ar: 'الإجراءات' },
  subtitle: {
    en: 'Oil Analysis engineering actions — latest action per lubrication point.',
    ar: 'إجراءات هندسة تحليل الزيت — أحدث إجراء لكل نقطة تشحيم.',
  },
  openPlatform: { en: 'Open Engineering Actions', ar: 'فتح إجراءات الهندسة' },
  newAction: { en: 'New Action', ar: 'إجراء جديد' },
  fastAction: { en: 'Fast Action', ar: 'إجراء سريع' },
  search: { en: 'Search action, LP, equipment…', ar: 'بحث في الإجراء أو نقطة التشحيم أو المعدة…' },
  filterLp: { en: 'LP_ID', ar: 'LP_ID' },
  filterStatus: { en: 'Status', ar: 'الحالة' },
  filterPriority: { en: 'Priority', ar: 'الأولوية' },
  filterAssigned: { en: 'Assigned To', ar: 'مسند إلى' },
  filterDueDate: { en: 'Due Date', ar: 'تاريخ الاستحقاق' },
  filterAll: { en: 'All', ar: 'الكل' },
  clearFilters: { en: 'Clear filters', ar: 'مسح الفلاتر' },
  colActionNo: { en: 'Action No.', ar: 'رقم الإجراء' },
  colLp: { en: 'LP_ID', ar: 'LP_ID' },
  colEquipment: { en: 'Equipment Name', ar: 'اسم المعدة' },
  colSample: { en: 'Sample ID', ar: 'معرّف العينة' },
  colPriority: { en: 'Priority', ar: 'الأولوية' },
  colStatus: { en: 'Status', ar: 'الحالة' },
  colContractor: { en: 'Contractor', ar: 'المقاول' },
  colAssigned: { en: 'Assigned To', ar: 'مسند إلى' },
  colDue: { en: 'Due Date', ar: 'تاريخ الاستحقاق' },
  colUpdated: { en: 'Last Update', ar: 'آخر تحديث' },
  emptyTitle: { en: 'No actions found', ar: 'لم يتم العثور على إجراءات' },
  emptyDesc: {
    en: 'Adjust filters or create a new action for an alert or caution sample.',
    ar: 'عدّل الفلاتر أو أنشئ إجراءً جديداً لعينة تنبيه أو حذر.',
  },
  kpiTotal: { en: 'LP actions', ar: 'إجراءات نقاط التشحيم' },
  kpiOpen: { en: 'Open', ar: 'مفتوحة' },
  kpiCritical: { en: 'Critical', ar: 'حرجة' },
  kpiOverdue: { en: 'Overdue', ar: 'متأخرة' },
  kpiAccReview: { en: 'Awaiting ACC', ar: 'بانتظار ACC' },
  fastTitle: { en: 'Submit Fast Action', ar: 'إرسال إجراء سريع' },
  fastLp: { en: 'LP_ID', ar: 'LP_ID' },
  fastType: { en: 'Action Type', ar: 'نوع الإجراء' },
  fastComment: { en: 'Comment', ar: 'تعليق' },
  fastDue: { en: 'Due Date', ar: 'تاريخ الاستحقاق' },
  fastSubmit: { en: 'Submit Immediate Action', ar: 'إرسال الإجراء الفوري' },
  fastCancel: { en: 'Cancel', ar: 'إلغاء' },
  fastSelectLp: { en: 'Select LP_ID', ar: 'اختر LP_ID' },
  fastRequired: { en: 'LP, action type, comment, and due date are required.', ar: 'LP ونوع الإجراء والتعليق وتاريخ الاستحقاق مطلوبة.' },
} as const;

export default function ActionsScreen(): React.ReactElement {
  const { locale } = useLanguage();
  const l = useCallback((bundle: L10n<string>) => t(bundle, locale), [locale]);
  const sdk = usePlatformSdk();
  const { status: authStatus, user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [search, setSearch] = useState('');
  const [lpId, setLpId] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);

  const [fastOpen, setFastOpen] = useState(false);
  const [fastLpId, setFastLpId] = useState('');
  const [fastType, setFastType] = useState('');
  const [fastComment, setFastComment] = useState('');
  const [fastDueDate, setFastDueDate] = useState('');
  const [fastError, setFastError] = useState<string | null>(null);
  const [fastSubmitting, setFastSubmitting] = useState(false);

  const contractorScope = useMemo(
    () => resolveOilAnalysisContractorScope(sdk),
    [sdk],
  );

  const canFastAction = resolveCanSubmitFastAction(contractorScope);

  const filterParams = useMemo(
    () => ({
      search,
      lpId: lpId || undefined,
      status: (status || undefined) as EngineeringActionStatus | undefined,
      priority: (priority || undefined) as EngineeringActionPriority | undefined,
      assignedTo: assignedTo || undefined,
      dueDate: dueDate || undefined,
    }),
    [search, lpId, status, priority, assignedTo, dueDate],
  );

  const pageData = useMemo(() => {
    if (authStatus !== 'authenticated') {
      return {
        view: {
          rows: [] as OilAnalysisActionListRow[],
          filterOptions: { lpIds: [], statuses: [], priorities: [], assignees: [] },
          kpis: { total: 0, open: 0, critical: 0, overdue: 0, pendingAccReview: 0 },
        },
        error: null as string | null,
      };
    }
    try {
      return {
        view: oilAnalysisActionsService.list(contractorScope, filterParams),
        error: null as string | null,
      };
    } catch (err) {
      return {
        view: {
          rows: [] as OilAnalysisActionListRow[],
          filterOptions: { lpIds: [], statuses: [], priorities: [], assignees: [] },
          kpis: { total: 0, open: 0, critical: 0, overdue: 0, pendingAccReview: 0 },
        },
        error: err instanceof Error ? err.message : 'Load failed',
      };
    }
  }, [authStatus, contractorScope, filterParams, reloadNonce]);

  const lpOptions = useMemo(
    () => oilAnalysisActionsService.listLpOptions(contractorScope),
    [contractorScope],
  );

  const activeFilterCount = [lpId, status, priority, assignedTo, dueDate].filter(Boolean).length;

  const filters: FilterFieldConfig[] = useMemo(
    () => [
      {
        id: 'lpId',
        label: l(COPY.filterLp),
        type: 'select',
        value: lpId,
        placeholder: l(COPY.filterAll),
        options: pageData.view.filterOptions.lpIds.map((value) => ({ value, label: value })),
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
      {
        id: 'assignedTo',
        label: l(COPY.filterAssigned),
        type: 'select',
        value: assignedTo,
        placeholder: l(COPY.filterAll),
        options: pageData.view.filterOptions.assignees.map((value) => ({ value, label: value })),
      },
      {
        id: 'dueDate',
        label: l(COPY.filterDueDate),
        type: 'date',
        value: dueDate,
      },
    ],
    [assignedTo, dueDate, l, lpId, pageData.view.filterOptions, priority, status],
  );

  const openAction = (row: OilAnalysisActionListRow): void => {
    navigate(`/oil-analysis/actions/${encodeURIComponent(row.id)}`);
  };

  const handleClearFilters = (): void => {
    setSearch('');
    setLpId('');
    setStatus('');
    setPriority('');
    setAssignedTo('');
    setDueDate('');
  };

  const handleFastSubmit = (): void => {
    if (!fastLpId || !fastType || !fastComment.trim() || !fastDueDate) {
      setFastError(l(COPY.fastRequired));
      return;
    }
    setFastSubmitting(true);
    setFastError(null);
    try {
      const saved = oilAnalysisActionsService.submitFastAction(
        contractorScope,
        {
          lpId: fastLpId,
          actionType: fastType,
          comment: fastComment.trim(),
          dueDate: fastDueDate,
        },
        user?.displayName ?? 'Contractor User',
        user?.roles[0],
        user?.contractorId,
      );
      setFastOpen(false);
      setFastLpId('');
      setFastType('');
      setFastComment('');
      setFastDueDate('');
      setReloadNonce((n) => n + 1);
      navigate(`/oil-analysis/actions/${encodeURIComponent(saved.id)}`);
    } catch (err) {
      setFastError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setFastSubmitting(false);
    }
  };

  const columns: DataTableColumn<OilAnalysisActionListRow>[] = useMemo(
    () => [
      { id: 'actionNo', header: l(COPY.colActionNo), accessor: 'actionNo', sortable: true, sticky: true },
      { id: 'lpId', header: l(COPY.colLp), accessor: 'lpId', sortable: true },
      { id: 'equipmentName', header: l(COPY.colEquipment), accessor: 'equipmentName', sortable: true },
      { id: 'sampleId', header: l(COPY.colSample), accessor: (row) => row.sampleId || '—' },
      {
        id: 'priority',
        header: l(COPY.colPriority),
        renderCell: (row) => (
          <StatusBadge
            variant={priorityBadgeVariant(row.priority) as StatusBadgeVariant}
            label={row.priority}
            size="sm"
          />
        ),
      },
      {
        id: 'status',
        header: l(COPY.colStatus),
        renderCell: (row) => {
          const badge = actionStatusBadge(row.status);
          return (
            <StatusBadge variant={badge.variant as StatusBadgeVariant} label={badge.label} size="sm" />
          );
        },
      },
      { id: 'contractor', header: l(COPY.colContractor), accessor: 'contractorName' },
      { id: 'assignedTo', header: l(COPY.colAssigned), accessor: (row) => row.assignedTo || '—' },
      { id: 'dueDate', header: l(COPY.colDue), accessor: (row) => formatDate(row.dueDate, locale) },
      {
        id: 'updatedAt',
        header: l(COPY.colUpdated),
        accessor: (row) => formatDateTime(row.updatedAt, locale),
        sortable: true,
      },
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

  const { rows, kpis } = pageData.view;

  return (
    <div className="acc-oa-page acc-oa-actions">
      <PageHeader
        title={l(COPY.title)}
        subtitle={l(COPY.subtitle)}
        breadcrumbs={[
          { label: l({ en: 'Oil Analysis', ar: 'تحليل الزيت' }), href: '/oil-analysis' },
          { label: l(COPY.title) },
        ]}
        actions={(
          <div className="acc-oa-actions__header-actions">
            <Link to="/engineering-actions" className="acc-btn acc-btn--secondary">
              {l(COPY.openPlatform)}
            </Link>
            <button
              type="button"
              className="acc-btn acc-btn--secondary"
              onClick={() => navigate('/oil-analysis/actions/new')}
            >
              {l(COPY.newAction)}
            </button>
            {canFastAction && (
              <button
                type="button"
                className="acc-btn acc-btn--primary"
                onClick={() => {
                  setFastOpen(true);
                  setFastError(null);
                }}
              >
                {l(COPY.fastAction)}
              </button>
            )}
          </div>
        )}
      />

      <KpiGrid desktopColumns={6}>
        <KpiCard value={kpis.total} label={l(COPY.kpiTotal)} severity="info" />
        <KpiCard value={kpis.open} label={l(COPY.kpiOpen)} severity="caution" />
        <KpiCard value={kpis.critical} label={l(COPY.kpiCritical)} severity="critical" />
        <KpiCard value={kpis.overdue} label={l(COPY.kpiOverdue)} severity="alert" />
        <KpiCard value={kpis.pendingAccReview} label={l(COPY.kpiAccReview)} severity="caution" />
      </KpiGrid>

      <FilterBar
        searchValue={search}
        searchPlaceholder={l(COPY.search)}
        onSearchChange={setSearch}
        filters={filters}
        onFilterChange={(id, value) => {
          if (id === 'lpId') setLpId(value);
          if (id === 'status') setStatus(value);
          if (id === 'priority') setPriority(value);
          if (id === 'assignedTo') setAssignedTo(value);
          if (id === 'dueDate') setDueDate(value);
        }}
        onClear={handleClearFilters}
        clearLabel={l(COPY.clearFilters)}
        activeFilterCount={activeFilterCount}
        trailing={
          isMobile && canFastAction ? (
            <button
              type="button"
              className="acc-btn acc-btn--primary"
              onClick={() => setFastOpen(true)}
            >
              {l(COPY.fastAction)}
            </button>
          ) : undefined
        }
      />

      {rows.length === 0 ? (
        <EmptyState title={l(COPY.emptyTitle)} description={l(COPY.emptyDesc)} />
      ) : isMobile ? (
        <CardList
          items={[...rows]}
          fields={[
            { id: 'actionNo', label: l(COPY.colActionNo), render: (row) => row.actionNo, emphasize: true },
            { id: 'lp', label: l(COPY.colLp), render: (row) => row.lpId },
            { id: 'equipment', label: l(COPY.colEquipment), render: (row) => row.equipmentName },
            { id: 'assigned', label: l(COPY.colAssigned), render: (row) => row.assignedTo || '—' },
            { id: 'due', label: l(COPY.colDue), render: (row) => formatDate(row.dueDate, locale) },
            { id: 'updated', label: l(COPY.colUpdated), render: (row) => formatDateTime(row.updatedAt, locale) },
          ]}
          getStatus={(row) => {
            const badge = actionStatusBadge(row.status);
            return { variant: badge.variant as StatusBadgeVariant, label: badge.label };
          }}
          onItemClick={openAction}
          emptyTitle={l(COPY.emptyTitle)}
          emptyDescription={l(COPY.emptyDesc)}
        />
      ) : (
        <DataTable
          columns={columns}
          data={[...rows]}
          onRowClick={openAction}
          emptyTitle={l(COPY.emptyTitle)}
          emptyDescription={l(COPY.emptyDesc)}
          stickyHeader
        />
      )}

      <Dialog
        open={fastOpen}
        onClose={() => setFastOpen(false)}
        title={l(COPY.fastTitle)}
        size="md"
        variant="form"
        footer={(
          <>
            <button type="button" className="acc-btn acc-btn--ghost" onClick={() => setFastOpen(false)}>
              {l(COPY.fastCancel)}
            </button>
            <button
              type="button"
              className="acc-btn acc-btn--primary"
              onClick={handleFastSubmit}
              disabled={fastSubmitting}
            >
              {l(COPY.fastSubmit)}
            </button>
          </>
        )}
      >
        <form className="acc-oa-action-form" onSubmit={(e) => e.preventDefault()}>
          {fastError && <p className="acc-oa-action-form__error" role="alert">{fastError}</p>}
          <label className="acc-oa-action-form__field">
            <span>{l(COPY.fastLp)}</span>
            <select
              value={fastLpId}
              onChange={(e) => setFastLpId(e.target.value)}
              required
            >
              <option value="">{l(COPY.fastSelectLp)}</option>
              {lpOptions.map((opt) => (
                <option key={opt.lpId} value={opt.lpId}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label className="acc-oa-action-form__field">
            <span>{l(COPY.fastType)}</span>
            <select value={fastType} onChange={(e) => setFastType(e.target.value)} required>
              <option value="">{l(COPY.filterAll)}</option>
              {ACTION_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>
          <label className="acc-oa-action-form__field">
            <span>{l(COPY.fastComment)}</span>
            <textarea
              value={fastComment}
              onChange={(e) => setFastComment(e.target.value)}
              rows={3}
              required
            />
          </label>
          <label className="acc-oa-action-form__field">
            <span>{l(COPY.fastDue)}</span>
            <input
              type="date"
              value={fastDueDate}
              onChange={(e) => setFastDueDate(e.target.value)}
              required
            />
          </label>
        </form>
      </Dialog>
    </div>
  );
}
