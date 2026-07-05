// apps/owner-center/src/pages/oil-analysis/TimelineScreen.tsx
// OA-007 — Combined oil sample and oil change timeline for one LP.

import React, { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { usePlatformSdk } from '../../context/SdkContext';
import { useOilAnalysisPermissions } from '../../hooks/useOilAnalysisPermissions';
import { OilAnalysisActionButton } from '../../components/oil-analysis/OilAnalysisActionButton';
import {
  PageHeader,
  FilterBar,
  KpiGrid,
  KpiCard,
  Timeline,
  StatusBadge,
  SectionCard,
  EmptyState,
  ErrorState,
  useIsMobile,
} from '../../components/ui';
import type { FilterFieldConfig, StatusBadgeVariant, TimelineEvent } from '../../components/ui';
import { resolveOilAnalysisContractorScope } from '../../modules/oil-analysis/contractor-scope';
import {
  oilAnalysisTimelineService,
  mapTimelineEventKind,
  mapTimelineEventSeverity,
  registerStatusBadge,
  type OilAnalysisTimelineView,
} from '../../modules/oil-analysis/timeline.service';
import { exportTimelinePdf } from '../../modules/oil-analysis/timeline-export';
import { getTimelineDirection } from '../../modules/oil-analysis/settings-guards';
import type { LpRegisterConditionStatus } from '../../modules/oil-analysis/lp-register.service';

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(locale === 'ar' ? 'ar-SA' : undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
}

function statusLabel(status: LpRegisterConditionStatus, locale: string): string {
  const map: Record<LpRegisterConditionStatus, L10n<string>> = {
    normal: { en: 'Normal', ar: 'طبيعي' },
    caution: { en: 'Caution', ar: 'حذر' },
    alert: { en: 'Alert', ar: 'تنبيه' },
    pending: { en: 'Pending', ar: 'قيد الانتظار' },
    none: { en: 'No sample', ar: 'لا توجد عينة' },
  };
  return t(map[status], locale);
}

const COPY = {
  title: { en: 'Timeline', ar: 'الجدول الزمني' },
  subtitle: { en: 'Oil samples and oil change history.', ar: 'سجل عينات الزيت وتغييرات الزيت.' },
  search: { en: 'Search by LP ID or Equipment', ar: 'بحث برقم نقطة التشحيم أو المعدة' },
  filterLp: { en: 'LP ID', ar: 'معرّف نقطة التشحيم' },
  filterAll: { en: 'All', ar: 'الكل' },
  clearFilters: { en: 'Clear filters', ar: 'مسح الفلاتر' },
  exportPdf: { en: 'Export PDF', ar: 'تصدير PDF' },
  metaEquipmentName: { en: 'Equipment Name', ar: 'اسم المعدة' },
  metaEquipmentId: { en: 'Equipment ID', ar: 'معرّف المعدة' },
  metaLpId: { en: 'LP ID', ar: 'معرّف نقطة التشحيم' },
  metaSamplingFreq: { en: 'Sampling Frequency', ar: 'فترة أخذ العينات' },
  metaOilChangeFreq: { en: 'Oil Change Frequency', ar: 'فترة تغيير الزيت' },
  metaStatus: { en: 'Current Status', ar: 'الحالة الحالية' },
  kpiLastSample: { en: 'Last Sample', ar: 'آخر عينة' },
  kpiNextSample: { en: 'Next Sample', ar: 'العينة القادمة' },
  kpiLastOilChange: { en: 'Last Oil Change', ar: 'آخر تغيير زيت' },
  kpiNextOilChange: { en: 'Next Oil Change', ar: 'تغيير الزيت القادم' },
  kpiDaysRemaining: { en: 'Days Remaining', ar: 'الأيام المتبقية' },
  kpiToNextSample: { en: 'To next sample', ar: 'حتى العينة القادمة' },
  sectionTimeline: { en: 'Timeline', ar: 'الجدول الزمني' },
  emptyTitle: { en: 'No lubrication points found', ar: 'لم يتم العثور على نقاط تشحيم' },
  emptyDesc: {
    en: 'Adjust search filters or register equipment lubrication points first.',
    ar: 'عدّل فلاتر البحث أو سجّل نقاط تشحيم المعدات أولاً.',
  },
  forbidden: { en: 'You do not have access to this lubrication point.', ar: 'لا تملك صلاحية الوصول إلى نقطة التشحيم هذه.' },
  legendTitle: { en: 'Legend', ar: 'دليل الألوان' },
  legendNormal: { en: 'Sample — Normal', ar: 'عينة — طبيعي' },
  legendCaution: { en: 'Sample — Caution', ar: 'عينة — حذر' },
  legendAlert: { en: 'Sample — Alert', ar: 'عينة — تنبيه' },
  legendOilChange: { en: 'Oil Change', ar: 'تغيير الزيت' },
  legendFutureSample: { en: 'Future Sample', ar: 'عينة مستقبلية' },
  legendFutureOilChange: { en: 'Future Oil Change', ar: 'تغيير زيت مستقبلي' },
  emptyTimeline: { en: 'No timeline events yet.', ar: 'لا توجد أحداث في الجدول الزمني بعد.' },
  popupDate: { en: 'Date', ar: 'التاريخ' },
  popupStatus: { en: 'Status', ar: 'الحالة' },
} as const;

const LEGEND_ITEMS = [
  { className: 'acc-oa-timeline__legend-dot--normal', label: COPY.legendNormal },
  { className: 'acc-oa-timeline__legend-dot--caution', label: COPY.legendCaution },
  { className: 'acc-oa-timeline__legend-dot--alert', label: COPY.legendAlert },
  { className: 'acc-oa-timeline__legend-dot--oil-change', label: COPY.legendOilChange },
  { className: 'acc-oa-timeline__legend-dot--future-sample', label: COPY.legendFutureSample },
  { className: 'acc-oa-timeline__legend-dot--future-oil-change', label: COPY.legendFutureOilChange },
] as const;

function buildUiEvents(
  view: OilAnalysisTimelineView,
  locale: string,
  direction: 'ltr' | 'rtl',
): TimelineEvent[] {
  const sorted = [...view.events].sort((a, b) => {
    const cmp = a.isoDate.localeCompare(b.isoDate);
    return direction === 'ltr' ? cmp : -cmp;
  });

  return sorted.map((event) => {
    const kind = mapTimelineEventKind(event.eventType);
    const severity = mapTimelineEventSeverity(event.eventType);
    const formattedDate = formatDate(event.isoDate, locale);

    return {
      id: event.id,
      kind,
      date: formattedDate,
      label: event.label,
      status: severity as StatusBadgeVariant,
      statusLabel: event.statusLabel,
      color: event.eventType === 'future-oil-change' ? '#7c3aed' : undefined,
      detail: (
        <dl className="acc-oa-timeline__popup">
          <div className="acc-oa-timeline__popup-row">
            <dt>{t(COPY.popupDate, locale)}</dt>
            <dd>{formattedDate}</dd>
          </div>
          <div className="acc-oa-timeline__popup-row">
            <dt>{t(COPY.popupStatus, locale)}</dt>
            <dd>
              <StatusBadge
                variant={severity as StatusBadgeVariant}
                label={event.statusLabel}
                size="sm"
              />
            </dd>
          </div>
        </dl>
      ),
    };
  });
}

export default function TimelineScreen(): React.ReactElement {
  const { locale } = useLanguage();
  const l = useCallback((bundle: L10n<string>) => t(bundle, locale), [locale]);
  const sdk = usePlatformSdk();
  const { status: authStatus } = useAuth();
  const permissions = useOilAnalysisPermissions();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [lpId, setLpId] = useState(() => searchParams.get('lp') ?? '');
  const [reloadNonce, setReloadNonce] = useState(0);

  const contractorScope = useMemo(
    () => resolveOilAnalysisContractorScope(sdk),
    [sdk],
  );

  const timelineDirection = getTimelineDirection();

  const pageData = useMemo(() => {
    if (authStatus !== 'authenticated') {
      return { result: { kind: 'empty' as const }, error: null as string | null };
    }
    try {
      const result = oilAnalysisTimelineService.load(
        contractorScope,
        locale,
        lpId || undefined,
        search || undefined,
      );
      return { result, error: null as string | null };
    } catch (err) {
      return {
        result: { kind: 'empty' as const },
        error: err instanceof Error ? err.message : 'Load failed',
      };
    }
  }, [authStatus, contractorScope, locale, lpId, search, reloadNonce]);

  const lpOptions = useMemo(
    () => oilAnalysisTimelineService.listLpOptions(contractorScope, search || undefined),
    [contractorScope, search],
  );

  const filters: FilterFieldConfig[] = useMemo(
    () => [
      {
        id: 'lpId',
        label: l(COPY.filterLp),
        type: 'select',
        value: lpId,
        placeholder: l(COPY.filterAll),
        options: lpOptions.map((opt) => ({ value: opt.lpId, label: opt.label })),
      },
    ],
    [l, lpId, lpOptions],
  );

  const handleLpChange = (value: string): void => {
    setLpId(value);
    const next = new URLSearchParams(searchParams);
    if (value) next.set('lp', value);
    else next.delete('lp');
    setSearchParams(next, { replace: true });
  };

  const handleClearFilters = (): void => {
    setSearch('');
    setLpId('');
    setSearchParams({}, { replace: true });
  };

  if (pageData.error) {
    return (
      <ErrorState
        message={pageData.error}
        onRetry={() => setReloadNonce((n) => n + 1)}
        className="acc-oa-page"
      />
    );
  }

  if (pageData.result.kind === 'forbidden') {
    return <ErrorState message={l(COPY.forbidden)} className="acc-oa-page" />;
  }

  if (pageData.result.kind === 'empty') {
    return (
      <div className="acc-oa-page acc-oa-timeline">
        <PageHeader title={l(COPY.title)} subtitle={l(COPY.subtitle)} />
        <FilterBar
          searchValue={search}
          searchPlaceholder={l(COPY.search)}
          onSearchChange={setSearch}
          filters={filters}
          onFilterChange={(id, value) => {
            if (id === 'lpId') handleLpChange(value);
          }}
          onClear={handleClearFilters}
          clearLabel={l(COPY.clearFilters)}
          activeFilterCount={lpId ? 1 : 0}
        />
        <EmptyState title={l(COPY.emptyTitle)} description={l(COPY.emptyDesc)} />
      </div>
    );
  }

  const { data } = pageData.result;
  const { header, summary } = data;
  const healthBadge = registerStatusBadge(header.currentStatus);
  const uiEvents = buildUiEvents(data, locale, timelineDirection);

  const lastSampleValue = summary.lastSampleDate
    ? formatDate(summary.lastSampleDate, locale)
    : '—';

  return (
    <div className="acc-oa-page acc-oa-timeline">
      <PageHeader
        title={l(COPY.title)}
        subtitle={l(COPY.subtitle)}
        status={{
          variant: healthBadge.variant as StatusBadgeVariant,
          label: statusLabel(header.currentStatus, locale),
        }}
        actions={(
          <OilAnalysisActionButton
            type="button"
            className="acc-btn acc-btn--secondary"
            allowed={permissions.canExportReports}
            onClick={() => exportTimelinePdf(data, locale)}
          >
            {l(COPY.exportPdf)}
          </OilAnalysisActionButton>
        )}
      />

      <FilterBar
        searchValue={search}
        searchPlaceholder={l(COPY.search)}
        onSearchChange={setSearch}
        filters={filters}
        onFilterChange={(id, value) => {
          if (id === 'lpId') handleLpChange(value);
        }}
        onClear={handleClearFilters}
        clearLabel={l(COPY.clearFilters)}
        activeFilterCount={lpId ? 1 : 0}
        trailing={isMobile ? (
          <OilAnalysisActionButton
            type="button"
            className="acc-btn acc-btn--secondary"
            allowed={permissions.canExportReports}
            onClick={() => exportTimelinePdf(data, locale)}
          >
            {l(COPY.exportPdf)}
          </OilAnalysisActionButton>
        ) : undefined}
      />

      <section className="acc-oa-timeline__header-card" aria-label={l(COPY.metaEquipmentName)}>
        <div className="acc-oa-timeline__header-main">
          <h2 className="acc-oa-timeline__equipment-name">{header.equipmentName}</h2>
          <p className="acc-oa-timeline__lp-line">
            <span>{header.lpId}</span>
            {header.lpName !== header.lpId && (
              <span className="acc-oa-timeline__lp-name"> — {header.lpName}</span>
            )}
          </p>
        </div>
        <dl className="acc-oa-timeline__meta">
          <div className="acc-oa-timeline__meta-item">
            <dt>{l(COPY.metaEquipmentId)}</dt>
            <dd>{header.equipmentId}</dd>
          </div>
          <div className="acc-oa-timeline__meta-item">
            <dt>{l(COPY.metaLpId)}</dt>
            <dd>{header.lpId}</dd>
          </div>
          <div className="acc-oa-timeline__meta-item">
            <dt>{l(COPY.metaSamplingFreq)}</dt>
            <dd>{header.samplingFrequency}</dd>
          </div>
          <div className="acc-oa-timeline__meta-item">
            <dt>{l(COPY.metaOilChangeFreq)}</dt>
            <dd>{header.oilChangeFrequency}</dd>
          </div>
          <div className="acc-oa-timeline__meta-item">
            <dt>{l(COPY.metaStatus)}</dt>
            <dd>
              <StatusBadge
                variant={healthBadge.variant as StatusBadgeVariant}
                label={statusLabel(header.currentStatus, locale)}
                size="sm"
              />
            </dd>
          </div>
        </dl>
      </section>

      <KpiGrid desktopColumns={6}>
        <KpiCard
          value={lastSampleValue}
          label={l(COPY.kpiLastSample)}
          severity={
            summary.lastSampleStatus === 'alert'
              ? 'alert'
              : summary.lastSampleStatus === 'caution'
                ? 'caution'
                : 'normal'
          }
        />
        <KpiCard
          value={formatDate(summary.nextSampleDate, locale)}
          label={l(COPY.kpiNextSample)}
          severity="info"
        />
        <KpiCard
          value={formatDate(summary.lastOilChangeDate, locale)}
          label={l(COPY.kpiLastOilChange)}
          severity="info"
        />
        <KpiCard
          value={formatDate(summary.nextOilChangeDate, locale)}
          label={l(COPY.kpiNextOilChange)}
          severity="future"
        />
        <KpiCard
          value={summary.daysRemaining ?? '—'}
          label={l(COPY.kpiDaysRemaining)}
          trend={
            summary.daysRemaining !== null
              ? { direction: 'flat', label: l(COPY.kpiToNextSample) }
              : undefined
          }
          severity="info"
        />
      </KpiGrid>

      <SectionCard
        title={l(COPY.sectionTimeline)}
        bodyClassName="acc-oa-timeline__body"
        empty={uiEvents.length === 0}
        emptyTitle={l(COPY.emptyTimeline)}
      >
        <div className="acc-oa-timeline__legend" aria-label={l(COPY.legendTitle)}>
          {LEGEND_ITEMS.map((item) => (
            <span key={item.className} className="acc-oa-timeline__legend-item">
              <span className={`acc-oa-timeline__legend-dot ${item.className}`} aria-hidden="true" />
              {l(item.label)}
            </span>
          ))}
        </div>
        <Timeline
          events={uiEvents}
          direction={isMobile ? 'vertical' : 'horizontal'}
          className={timelineDirection === 'rtl' ? 'acc-timeline--rtl' : undefined}
          emptyLabel={l(COPY.emptyTimeline)}
        />
      </SectionCard>
    </div>
  );
}
