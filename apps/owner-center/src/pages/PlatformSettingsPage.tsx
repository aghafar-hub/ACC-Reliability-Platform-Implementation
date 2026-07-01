// apps/owner-center/src/pages/PlatformSettingsPage.tsx
// Platform Settings Center — functional page backed by sdk.config.
//
// Phase 1K: replaces the static placeholder with live platform configuration data.
// Read-only — viewing configuration never creates audit records.
// Bilingual EN/AR with RTL support via dir attribute on the shell root.
//
// Platform rule: "Platform settings are created by default during installation.
//                 The App Owner edits approved platform configuration;
//                 operational data is managed in the appropriate Owner Center."

import React, { useState, useCallback, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePlatformSdk } from '../context/SdkContext';
import { SummaryCard } from '../components/SummaryCard';
import { StatusChip } from '../components/StatusChip';
import { BackToSettingsLink } from '../components/BackToSettingsLink';
import type { ConfigEntry, ConfigSummary } from '@acc-reliability/sdk';

// ── Locale helpers ────────────────────────────────────────────────────────────

interface L10n {
  en: string;
  ar: string;
}

function t(bundle: L10n, locale: string): string {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

// ── Copy ──────────────────────────────────────────────────────────────────────

const COPY = {
  pageTitle:       { en: 'Platform Settings Center',    ar: 'مركز إعدادات المنصة' },
  pageDesc:        { en: 'Configure general platform behaviour, manage themes and appearance, control language defaults, set security policies, define platform defaults, and maintain configuration backups.', ar: 'تكوين السلوك العام للمنصة وإدارة السمات والمظهر والتحكم في افتراضيات اللغة وتعيين سياسات الأمان وتحديد افتراضيات المنصة والحفاظ على نسخ احتياطية للتكوين.' },
  liveData:        { en: 'Live data',                     ar: 'بيانات حية' },

  ruleHeading:     { en: 'Settings Ownership Rule',       ar: 'قاعدة ملكية الإعدادات' },
  ruleText:        { en: 'Platform settings are created by default during installation. The App Owner edits approved platform configuration; operational data is managed in the appropriate Owner Center.', ar: 'تُنشأ إعدادات المنصة بشكل افتراضي أثناء التثبيت. يحرّر مالك التطبيق التكوين المعتمد للمنصة؛ وتُدار البيانات التشغيلية في مركز المالك المناسب.' },

  totalKeys:       { en: 'Total Configuration Keys',      ar: 'إجمالي مفاتيح التكوين' },
  modifiedSettings:{ en: 'Modified Settings',             ar: 'الإعدادات المعدّلة' },
  defaultSettings: { en: 'Default Settings',              ar: 'الإعدادات الافتراضية' },
  configGroups:    { en: 'Configuration Groups',          ar: 'مجموعات التكوين' },

  refreshBtn:      { en: 'Refresh',                       ar: 'تحديث' },
  refreshing:      { en: 'Refreshing…',                   ar: 'جارٍ التحديث…' },
  searchPlaceholder:{ en: 'Search keys…',                 ar: 'البحث في المفاتيح…' },
  filterGroup:     { en: 'All Groups',                    ar: 'جميع المجموعات' },

  colKey:          { en: 'Key',                           ar: 'المفتاح' },
  colGroup:        { en: 'Category / Group',              ar: 'الفئة / المجموعة' },
  colCurrent:      { en: 'Current Value',                 ar: 'القيمة الحالية' },
  colDefault:      { en: 'Default Value',                 ar: 'القيمة الافتراضية' },
  colType:         { en: 'Data Type',                     ar: 'نوع البيانات' },
  colEditable:     { en: 'Editable',                      ar: 'قابل للتحرير' },

  editableYes:     { en: 'Yes',                           ar: 'نعم' },
  editableNo:      { en: 'No',                            ar: 'لا' },
  modifiedBadge:   { en: 'Modified',                      ar: 'معدّل' },
  defaultBadge:    { en: 'Default',                       ar: 'افتراضي' },

  noEntries:       { en: 'No configuration entries match the current filters.', ar: 'لا توجد إدخالات تكوين تطابق عوامل التصفية الحالية.' },
  readOnlyNote:    { en: 'Configuration is read-only. Changes require environment variables or an approved config provider.', ar: 'التكوين للقراءة فقط. تتطلب التغييرات متغيرات البيئة أو موفر تكوين معتمد.' },
} as const;

// ── Helper utilities ──────────────────────────────────────────────────────────

function formatValue(value: string | number | boolean | undefined): string {
  if (value === undefined) return '—';
  return String(value);
}

function loadConfigData(
  listEntries: () => readonly ConfigEntry[],
  getSummary: () => ConfigSummary,
): { entries: readonly ConfigEntry[]; summary: ConfigSummary } {
  return {
    entries: listEntries(),
    summary: getSummary(),
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PlatformSettingsPage(): React.ReactElement {
  const { locale } = useLanguage();
  const sdk = usePlatformSdk();

  const [data, setData] = useState(() =>
    loadConfigData(
      () => sdk.config.listEntries(),
      () => sdk.config.getSummary(),
    ),
  );
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  const groups = useMemo(() => {
    const set = new Set(data.entries.map((entry) => entry.group));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data.entries]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.entries.filter((entry) => {
      if (groupFilter && entry.group !== groupFilter) return false;
      if (!query) return true;
      return (
        entry.key.toLowerCase().includes(query) ||
        entry.group.toLowerCase().includes(query) ||
        formatValue(entry.currentValue).toLowerCase().includes(query)
      );
    });
  }, [data.entries, search, groupFilter]);

  const refreshData = useCallback(() => {
    setData(
      loadConfigData(
        () => sdk.config.listEntries(),
        () => sdk.config.getSummary(),
      ),
    );
    setOpError(null);
  }, [sdk]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setOpError(null);
    try {
      await sdk.config.reload();
      refreshData();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Configuration refresh failed.');
    } finally {
      setRefreshing(false);
    }
  }, [sdk, refreshData]);

  const { summary } = data;

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

      {/* ── Settings ownership rule ── */}
      <div className="con-rule" role="note" aria-label={t(COPY.ruleHeading, locale)}>
        <span className="con-rule__heading">{t(COPY.ruleHeading, locale)}</span>
        <span className="con-rule__text">{t(COPY.ruleText, locale)}</span>
      </div>

      <p className="ur-page__desc">{t(COPY.readOnlyNote, locale)}</p>

      {opError && <p className="ur-inline-error">{opError}</p>}

      {/* ── Summary cards ── */}
      <div className="ur-summary-grid">
        <SummaryCard
          value={String(summary.totalKeys)}
          label={t(COPY.totalKeys, locale)}
          modifier="neutral"
        />
        <SummaryCard
          value={String(summary.modifiedCount)}
          label={t(COPY.modifiedSettings, locale)}
          modifier="warning"
        />
        <SummaryCard
          value={String(summary.defaultCount)}
          label={t(COPY.defaultSettings, locale)}
          modifier="info"
        />
        <SummaryCard
          value={String(summary.groupCount)}
          label={t(COPY.configGroups, locale)}
          modifier="caution"
        />
      </div>

      {/* ── Toolbar: search + group filter + refresh ── */}
      <div className="ur-toolbar">
        <div className="ur-filter-group">
          <input
            className="ur-form-input ur-form-input--inline"
            type="search"
            placeholder={t(COPY.searchPlaceholder, locale)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="ur-form-input ur-form-input--inline"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <option value="">{t(COPY.filterGroup, locale)}</option>
            {groups.map((group) => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="ur-btn ur-btn--secondary"
          onClick={() => { void handleRefresh(); }}
          disabled={refreshing}
        >
          {refreshing ? t(COPY.refreshing, locale) : t(COPY.refreshBtn, locale)}
        </button>
      </div>

      {/* ── Configuration table ── */}
      <div className="ur-table-wrap">
        <table className="ur-table">
          <thead>
            <tr>
              <th>{t(COPY.colKey, locale)}</th>
              <th>{t(COPY.colGroup, locale)}</th>
              <th>{t(COPY.colCurrent, locale)}</th>
              <th>{t(COPY.colDefault, locale)}</th>
              <th>{t(COPY.colType, locale)}</th>
              <th>{t(COPY.colEditable, locale)}</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="ur-table__empty">
                  {t(COPY.noEntries, locale)}
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => (
                <tr key={entry.key}>
                  <td>
                    <div className="ur-user-name">{entry.key}</div>
                    {entry.isModified && (
                      <StatusChip
                        status="warning"
                        label={t(COPY.modifiedBadge, locale)}
                      />
                    )}
                  </td>
                  <td>{entry.group}</td>
                  <td className="ur-table__desc">{formatValue(entry.currentValue)}</td>
                  <td className="ur-table__desc">{formatValue(entry.defaultValue)}</td>
                  <td>{entry.dataType}</td>
                  <td>
                    {entry.editable
                      ? t(COPY.editableYes, locale)
                      : t(COPY.editableNo, locale)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
