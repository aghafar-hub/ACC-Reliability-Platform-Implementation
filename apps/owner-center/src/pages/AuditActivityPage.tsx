// apps/owner-center/src/pages/AuditActivityPage.tsx
// Audit & Activity Center — functional page backed by sdk.audit.
//
// Phase 1J: replaces the static placeholder with live audit trail data.
// Read-only — viewing audit data never creates new audit records.
// Bilingual EN/AR with RTL support via dir attribute on the shell root.

import React, { useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePlatformSdk } from '../context/SdkContext';
import { SummaryCard } from '../components/SummaryCard';
import { StatusChip } from '../components/StatusChip';
import { BackToSettingsLink } from '../components/BackToSettingsLink';
import type { ChipStatus } from '../components/StatusChip';
import type {
  AuditEntry,
  AuditQuery,
  AuditTimeline,
  AuditCategory,
  AuditOutcome,
  AuditSeverity,
} from '@acc-reliability/sdk';
import { createUserId } from '@acc-reliability/sdk';

// ── Locale helpers ────────────────────────────────────────────────────────────

interface L10n { en: string; ar: string; }
function t(b: L10n, locale: string): string {
  return locale === 'ar' ? b.ar : b.en;
}

// ── Copy ──────────────────────────────────────────────────────────────────────

const COPY = {
  pageTitle:       { en: 'Audit & Activity Center',   ar: 'مركز التدقيق والنشاط' },
  pageDesc:        { en: 'Explore immutable audit records, monitor user activity, investigate security events, track configuration changes, and manage audit retention policy across the platform.', ar: 'استكشاف سجلات التدقيق غير القابلة للتغيير ومراقبة نشاط المستخدم والتحقيق في أحداث الأمان وتتبع تغييرات التكوين وإدارة سياسة الاحتفاظ بالتدقيق عبر المنصة.' },
  liveData:        { en: 'Live data',                   ar: 'بيانات حية' },

  ruleHeading:     { en: 'Immutability Rule',           ar: 'قاعدة عدم قابلية التغيير' },
  ruleText:        { en: 'Audit records are immutable. Every significant platform action is recorded with who, what, when, where, why, and result. Historical audit records can never be edited or deleted.', ar: 'سجلات التدقيق غير قابلة للتغيير. يُسجَّل كل إجراء جوهري في المنصة بمن وماذا ومتى وأين ولماذا والنتيجة. لا يمكن تحرير سجلات التدقيق التاريخية أو حذفها أبداً.' },

  totalRecords:    { en: 'Total Audit Records',         ar: 'إجمالي سجلات التدقيق' },
  securityEvents:  { en: 'Security Events',             ar: 'أحداث الأمان' },
  businessEvents:  { en: 'Business Events',             ar: 'أحداث الأعمال' },
  systemEvents:    { en: 'System Events',               ar: 'أحداث النظام' },

  refreshBtn:      { en: 'Refresh',                     ar: 'تحديث' },
  prevPage:        { en: 'Previous',                    ar: 'السابق' },
  nextPage:        { en: 'Next',                        ar: 'التالي' },
  pageInfo:        { en: 'Page',                        ar: 'صفحة' },
  of:              { en: 'of',                          ar: 'من' },

  filterCategory:  { en: 'All Categories',              ar: 'جميع الفئات' },
  filterUser:      { en: 'User ID',                     ar: 'معرف المستخدم' },
  filterEntity:    { en: 'Entity Type',                 ar: 'نوع الكيان' },
  filterResult:    { en: 'All Results',                 ar: 'جميع النتائج' },

  colTimestamp:    { en: 'Timestamp',                   ar: 'الطابع الزمني' },
  colCategory:     { en: 'Category',                    ar: 'الفئة' },
  colEvent:        { en: 'Event',                       ar: 'الحدث' },
  colEntity:       { en: 'Entity',                      ar: 'الكيان' },
  colUser:         { en: 'User',                        ar: 'المستخدم' },
  colResult:       { en: 'Result',                      ar: 'النتيجة' },
  colSeverity:     { en: 'Severity',                    ar: 'الخطورة' },

  noRecords:       { en: 'No audit records match the current filters.', ar: 'لا توجد سجلات تدقيق تطابق عوامل التصفية الحالية.' },

  timelineHeading: { en: 'Entity Timelines',            ar: 'الجداول الزمنية للكيانات' },
  timelineDesc:    { en: 'Recent audit activity grouped by entity (read-only).', ar: 'نشاط التدقيق الأخير مجمّع حسب الكيان (للقراءة فقط).' },
  noTimelines:     { en: 'No entity timelines available for the current data.', ar: 'لا توجد جداول زمنية للكيانات في البيانات الحالية.' },

  resultSuccess:   { en: 'Success',                     ar: 'نجاح' },
  resultFailure:   { en: 'Failure',                     ar: 'فشل' },
  resultDenied:    { en: 'Denied',                      ar: 'مرفوض' },
} as const;

const PAGE_SIZE = 25;
const MAX_TIMELINES = 5;
const TIMELINE_ENTRY_LIMIT = 10;

const CATEGORY_OPTIONS: readonly AuditCategory[] = [
  'auth', 'data', 'config', 'security', 'gateway', 'module', 'system',
];

const OUTCOME_OPTIONS: readonly AuditOutcome[] = ['success', 'failure', 'denied'];

// ── Helper utilities ──────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
}

function formatEntity(entry: AuditEntry): string {
  const { entityType, entityId } = entry.resource;
  return entityId ? `${entityType} / ${entityId}` : entityType;
}

function outcomeChip(
  outcome: AuditOutcome,
  locale: string,
): { chipStatus: ChipStatus; label: string } {
  switch (outcome) {
    case 'success':
      return { chipStatus: 'operational', label: t(COPY.resultSuccess, locale) };
    case 'failure':
      return { chipStatus: 'critical', label: t(COPY.resultFailure, locale) };
    case 'denied':
      return { chipStatus: 'warning', label: t(COPY.resultDenied, locale) };
    default:
      return { chipStatus: 'draft', label: outcome };
  }
}

function severityLabel(severity: AuditSeverity | undefined): string {
  if (!severity) return '—';
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

interface AuditFilters {
  readonly category: AuditCategory | '';
  readonly userId: string;
  readonly entityType: string;
  readonly outcome: AuditOutcome | '';
}

function buildQueryFilter(
  filters: AuditFilters,
  offset: number,
  limit: number,
): AuditQuery | null {
  const query: {
    category?: AuditCategory;
    userId?: ReturnType<typeof createUserId>;
    entityType?: string;
    outcome?: AuditOutcome;
    offset: number;
    limit: number;
  } = { offset, limit };

  if (filters.category) query.category = filters.category;
  if (filters.userId.trim()) {
    try {
      query.userId = createUserId(filters.userId.trim());
    } catch {
      return null;
    }
  }
  if (filters.entityType.trim()) query.entityType = filters.entityType.trim();
  if (filters.outcome) query.outcome = filters.outcome;

  return query;
}

function buildCountFilter(filters: AuditFilters): AuditQuery | null {
  const full = buildQueryFilter(filters, 0, 1);
  if (!full) return null;
  const { offset: _offset, limit: _limit, ...rest } = full;
  return rest;
}

interface EntityKey {
  readonly entityType: string;
  readonly entityId: string;
}

function collectEntityKeys(entries: readonly AuditEntry[]): readonly EntityKey[] {
  const seen = new Set<string>();
  const keys: EntityKey[] = [];
  for (const entry of entries) {
    const { entityType, entityId } = entry.resource;
    if (!entityId) continue;
    const key = `${entityType}:${entityId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    keys.push({ entityType, entityId });
    if (keys.length >= MAX_TIMELINES) break;
  }
  return keys;
}

interface AuditPageData {
  readonly entries: readonly AuditEntry[];
  readonly total: number;
  readonly timelines: readonly AuditTimeline[];
  readonly summary: {
    readonly total: number;
    readonly security: number;
    readonly business: number;
    readonly system: number;
  };
}

function loadAuditData(
  queryFn: (filter: AuditQuery) => readonly AuditEntry[],
  countFn: (filter?: AuditQuery) => number,
  timelineFn: (entityType: string, entityId: string, limit?: number) => AuditTimeline,
  filters: AuditFilters,
  offset: number,
): AuditPageData {
  const queryFilter = buildQueryFilter(filters, offset, PAGE_SIZE);
  const countFilter = buildCountFilter(filters);

  if (!queryFilter || !countFilter) {
    return {
      entries: [],
      total: 0,
      timelines: [],
      summary: {
        total: countFn(),
        security: countFn({ category: 'security' }),
        business: countFn({ category: 'data' }),
        system: countFn({ category: 'system' }),
      },
    };
  }

  const entries = queryFn(queryFilter);
  const total = countFn(countFilter);

  const entityKeys = collectEntityKeys(entries);
  const timelines = entityKeys.map(({ entityType, entityId }) =>
    timelineFn(entityType, entityId, TIMELINE_ENTRY_LIMIT),
  );

  return {
    entries,
    total,
    timelines,
    summary: {
      total: countFn(),
      security: countFn({ category: 'security' }),
      business: countFn({ category: 'data' }),
      system: countFn({ category: 'system' }),
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AuditActivityPage(): React.ReactElement {
  const { locale } = useLanguage();
  const sdk = usePlatformSdk();

  const [filters, setFilters] = useState<AuditFilters>({
    category: '',
    userId: '',
    entityType: '',
    outcome: '',
  });
  const [offset, setOffset] = useState(0);

  const [data, setData] = useState<AuditPageData>(() =>
    loadAuditData(
      (f) => sdk.audit.query(f),
      (f) => sdk.audit.count(f),
      (et, ei, lim) => sdk.audit.getTimeline(et, ei, lim),
      { category: '', userId: '', entityType: '', outcome: '' },
      0,
    ),
  );

  const summary = data.summary;

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const refresh = useCallback((nextFilters: AuditFilters, nextOffset: number) => {
    setData(loadAuditData(
      (f) => sdk.audit.query(f),
      (f) => sdk.audit.count(f),
      (et, ei, lim) => sdk.audit.getTimeline(et, ei, lim),
      nextFilters,
      nextOffset,
    ));
  }, [sdk]);

  const handleRefresh = useCallback(() => {
    refresh(filters, offset);
  }, [refresh, filters, offset]);

  const handleFilterChange = useCallback((
    patch: Partial<AuditFilters>,
  ) => {
    const nextFilters = { ...filters, ...patch };
    setFilters(nextFilters);
    setOffset(0);
    refresh(nextFilters, 0);
  }, [filters, refresh]);

  const handlePrevPage = useCallback(() => {
    const nextOffset = Math.max(0, offset - PAGE_SIZE);
    setOffset(nextOffset);
    refresh(filters, nextOffset);
  }, [offset, filters, refresh]);

  const handleNextPage = useCallback(() => {
    const nextOffset = offset + PAGE_SIZE;
    if (nextOffset >= data.total) return;
    setOffset(nextOffset);
    refresh(filters, nextOffset);
  }, [offset, data.total, filters, refresh]);

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

      {/* ── Immutability rule ── */}
      <div className="con-rule" role="note" aria-label={t(COPY.ruleHeading, locale)}>
        <span className="con-rule__heading">{t(COPY.ruleHeading, locale)}</span>
        <span className="con-rule__text">{t(COPY.ruleText, locale)}</span>
      </div>

      {/* ── Summary cards ── */}
      <div className="ur-summary-grid">
        <SummaryCard
          value={String(summary.total)}
          label={t(COPY.totalRecords, locale)}
          modifier="neutral"
        />
        <SummaryCard
          value={String(summary.security)}
          label={t(COPY.securityEvents, locale)}
          modifier="warning"
        />
        <SummaryCard
          value={String(summary.business)}
          label={t(COPY.businessEvents, locale)}
          modifier="info"
        />
        <SummaryCard
          value={String(summary.system)}
          label={t(COPY.systemEvents, locale)}
          modifier="caution"
        />
      </div>

      {/* ── Toolbar: filters + refresh + pagination ── */}
      <div className="ur-toolbar">
        <div className="ur-filter-group">
          <select
            className="ur-form-input ur-form-input--inline"
            value={filters.category}
            onChange={(e) => handleFilterChange({ category: e.target.value as AuditCategory | '' })}
          >
            <option value="">{t(COPY.filterCategory, locale)}</option>
            {CATEGORY_OPTIONS.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <input
            className="ur-form-input ur-form-input--inline"
            type="text"
            placeholder={t(COPY.filterUser, locale)}
            value={filters.userId}
            onChange={(e) => handleFilterChange({ userId: e.target.value })}
          />
          <input
            className="ur-form-input ur-form-input--inline"
            type="text"
            placeholder={t(COPY.filterEntity, locale)}
            value={filters.entityType}
            onChange={(e) => handleFilterChange({ entityType: e.target.value })}
          />
          <select
            className="ur-form-input ur-form-input--inline"
            value={filters.outcome}
            onChange={(e) => handleFilterChange({ outcome: e.target.value as AuditOutcome | '' })}
          >
            <option value="">{t(COPY.filterResult, locale)}</option>
            {OUTCOME_OPTIONS.map((outcome) => (
              <option key={outcome} value={outcome}>{outcome}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="ur-btn ur-btn--secondary"
          onClick={handleRefresh}
        >
          {t(COPY.refreshBtn, locale)}
        </button>
        <button
          type="button"
          className="ur-btn ur-btn--ghost"
          onClick={handlePrevPage}
          disabled={offset === 0}
        >
          {t(COPY.prevPage, locale)}
        </button>
        <span className="ur-table__date">
          {t(COPY.pageInfo, locale)} {currentPage} {t(COPY.of, locale)} {totalPages}
        </span>
        <button
          type="button"
          className="ur-btn ur-btn--ghost"
          onClick={handleNextPage}
          disabled={offset + PAGE_SIZE >= data.total}
        >
          {t(COPY.nextPage, locale)}
        </button>
      </div>

      {/* ── Activity table ── */}
      <div className="ur-table-wrap">
        <table className="ur-table">
          <thead>
            <tr>
              <th>{t(COPY.colTimestamp, locale)}</th>
              <th>{t(COPY.colCategory, locale)}</th>
              <th>{t(COPY.colEvent, locale)}</th>
              <th>{t(COPY.colEntity, locale)}</th>
              <th>{t(COPY.colUser, locale)}</th>
              <th>{t(COPY.colResult, locale)}</th>
              <th>{t(COPY.colSeverity, locale)}</th>
            </tr>
          </thead>
          <tbody>
            {data.entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="ur-table__empty">
                  {t(COPY.noRecords, locale)}
                </td>
              </tr>
            ) : (
              data.entries.map((entry) => {
                const chip = outcomeChip(entry.outcome, locale);
                return (
                  <tr key={entry.id}>
                    <td className="ur-table__date">{formatDateTime(entry.recordedAt)}</td>
                    <td>
                      <span className="ur-badge ur-badge--sm">{entry.category}</span>
                    </td>
                    <td>
                      <div className="ur-user-name">{entry.action}</div>
                      {entry.description && (
                        <div className="ur-user-email">{entry.description}</div>
                      )}
                    </td>
                    <td>{formatEntity(entry)}</td>
                    <td className="ur-table__contractor">
                      {entry.actor.userId ?? <span className="ur-table__empty-cell">—</span>}
                    </td>
                    <td>
                      <StatusChip status={chip.chipStatus} label={chip.label} />
                    </td>
                    <td>{severityLabel(entry.severity)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Entity timelines ── */}
      <h2 className="ur-page__title">{t(COPY.timelineHeading, locale)}</h2>
      <p className="ur-page__desc">{t(COPY.timelineDesc, locale)}</p>

      {data.timelines.length === 0 ? (
        <p className="ur-table__empty">{t(COPY.noTimelines, locale)}</p>
      ) : (
        data.timelines.map((timeline) => (
          <div key={`${timeline.entityType}:${timeline.entityId}`} className="ur-table-wrap">
            <div className="ur-user-name">
              {timeline.entityType} / {timeline.entityId}
              <span className="ur-user-email"> ({timeline.total} {t(COPY.totalRecords, locale).toLowerCase()})</span>
            </div>
            <table className="ur-table">
              <thead>
                <tr>
                  <th>{t(COPY.colTimestamp, locale)}</th>
                  <th>{t(COPY.colEvent, locale)}</th>
                  <th>{t(COPY.colUser, locale)}</th>
                  <th>{t(COPY.colResult, locale)}</th>
                </tr>
              </thead>
              <tbody>
                {timeline.entries.map((entry) => {
                  const chip = outcomeChip(entry.outcome, locale);
                  return (
                    <tr key={entry.id}>
                      <td className="ur-table__date">{formatDateTime(entry.recordedAt)}</td>
                      <td>{entry.action}</td>
                      <td className="ur-table__contractor">
                        {entry.actor.userId ?? <span className="ur-table__empty-cell">—</span>}
                      </td>
                      <td>
                        <StatusChip status={chip.chipStatus} label={chip.label} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))
      )}

    </div>
  );
}
