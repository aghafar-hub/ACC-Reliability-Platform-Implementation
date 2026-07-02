// apps/owner-center/src/pages/oil-analysis/ModuleSettings.tsx
// Oil Analysis — Module Administration (Sprint 09).

import React, { useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { usePlatformSdk } from '../../context/SdkContext';
import { StatusChip } from '../../components/StatusChip';
import { OilAnalysisActionButton } from '../../components/oil-analysis/OilAnalysisActionButton';
import { useOilAnalysisPermissions } from '../../hooks/useOilAnalysisPermissions';
import type {
  OilAnalysisModuleSettings,
  OilAnalysisParameterSetting,
  OilAnalysisConditionLevel,
} from '../../modules/oil-analysis/settings-types';
import { oilAnalysisSettingsService } from '../../modules/oil-analysis/settings.service';

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

function formatAuditDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

function parseThreshold(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

function formatThreshold(value: number | null): string {
  return value === null ? '' : String(value);
}

const COPY = {
  title:           { en: 'Module Settings',              ar: 'إعدادات الوحدة' },
  desc:            { en: 'Configure Oil Analysis module behaviour, parameters, and condition rules.', ar: 'ضبط سلوك وحدة تحليل الزيت والمعاملات وقواعد الحالة.' },
  liveData:        { en: 'Cached settings',              ar: 'إعدادات مخزنة' },
  btnSave:         { en: 'Save Settings',                ar: 'حفظ الإعدادات' },
  btnSaved:        { en: 'Settings saved.',              ar: 'تم حفظ الإعدادات.' },
  secGeneral:      { en: 'General Settings',             ar: 'الإعدادات العامة' },
  secLaboratory:   { en: 'Laboratory Settings',          ar: 'إعدادات المختبر' },
  secParameters:   { en: 'Parameter Settings',           ar: 'إعدادات المعاملات' },
  secConditions:   { en: 'Condition Rules',              ar: 'قواعد الحالة' },
  secPermissions:  { en: 'Permissions',                  ar: 'الصلاحيات' },
  secData:         { en: 'Data Management',              ar: 'إدارة البيانات' },
  secAudit:        { en: 'Audit',                        ar: 'التدقيق' },
  fldDefStatus:    { en: 'Default Sample Status',        ar: 'حالة العينة الافتراضية' },
  fldApprovalWf:   { en: 'Default Approval Workflow Enabled', ar: 'تفعيل سير الموافقة الافتراضي' },
  fldReqApproval:  { en: 'Require Engineer Approval',    ar: 'اشتراط اعتماد المهندس' },
  fldTrend:        { en: 'Enable Trend Engine',          ar: 'تفعيل محرك الاتجاهات' },
  fldPdf:          { en: 'Enable PDF Import',            ar: 'تفعيل استيراد PDF' },
  fldManual:       { en: 'Enable Manual Entry',          ar: 'تفعيل الإدخال اليدوي' },
  fldCsv:          { en: 'Enable CSV Export',            ar: 'تفعيل تصدير CSV' },
  fldJson:         { en: 'Enable JSON Export',           ar: 'تفعيل تصدير JSON' },
  stImported:      { en: 'Imported',                     ar: 'مستورد' },
  stPending:       { en: 'Pending Review',               ar: 'بانتظار المراجعة' },
  fldLab:          { en: 'Default Laboratory',           ar: 'المختبر الافتراضي' },
  fldPrefix:       { en: 'Sample Number Prefix',         ar: 'بادئة رقم العينة' },
  fldCurrency:     { en: 'Default Currency (future)',    ar: 'العملة الافتراضية (مستقبلاً)' },
  fldLang:         { en: 'Default Report Language',      ar: 'لغة التقرير الافتراضية' },
  fldUnitPpm:      { en: 'Unit — ppm',                   ar: 'وحدة — ppm' },
  fldUnitCst:      { en: 'Unit — cSt',                   ar: 'وحدة — cSt' },
  fldUnitPct:      { en: 'Unit — %',                     ar: 'وحدة — %' },
  fldDateFmt:      { en: 'Date Format',                  ar: 'تنسيق التاريخ' },
  colParam:        { en: 'Parameter',                    ar: 'المعامل' },
  colUnit:         { en: 'Unit',                         ar: 'الوحدة' },
  colEnabled:      { en: 'Enabled',                      ar: 'مفعّل' },
  colMonitor:      { en: 'Monitor ≥',                    ar: 'مراقبة ≥' },
  colCaution:      { en: 'Caution ≥',                    ar: 'تحذير ≥' },
  colCritical:     { en: 'Critical ≥',                   ar: 'حرج ≥' },
  paramHint:       { en: 'Disabling a parameter hides it from entry and trends. Sample data is never deleted.', ar: 'إخفاء المعامل يمنع ظهوره في الإدخال والاتجاهات. بيانات العينات لا تُحذف أبداً.' },
  condNormal:      { en: 'Normal',                       ar: 'طبيعي' },
  condMonitor:     { en: 'Monitor',                      ar: 'مراقبة' },
  condCaution:     { en: 'Caution',                      ar: 'تحذير' },
  condCritical:    { en: 'Critical',                     ar: 'حرج' },
  permReadOnly:    { en: 'Read-only view of Oil Analysis permissions. Future permissions will appear here automatically.', ar: 'عرض للقراءة فقط لصلاحيات تحليل الزيت. ستظهر الصلاحيات المستقبلية هنا تلقائياً.' },
  btnExport:       { en: 'Export Settings JSON',         ar: 'تصدير إعدادات JSON' },
  btnImport:       { en: 'Import Settings JSON',         ar: 'استيراد إعدادات JSON' },
  btnReset:        { en: 'Reset Module Settings',        ar: 'إعادة تعيين إعدادات الوحدة' },
  resetTitle:      { en: 'Reset Module Settings?',       ar: 'إعادة تعيين إعدادات الوحدة؟' },
  resetDesc:       { en: 'This restores all module settings to factory defaults. Sample and lab data will not be deleted.', ar: 'يستعيد جميع إعدادات الوحدة إلى القيم الافتراضية. لن تُحذف بيانات العينات أو المختبر.' },
  resetConfirm:    { en: 'Reset Settings',               ar: 'إعادة التعيين' },
  resetCancel:     { en: 'Cancel',                       ar: 'إلغاء' },
  auditLast:       { en: 'Last Settings Change',         ar: 'آخر تغيير للإعدادات' },
  auditBy:         { en: 'Changed By',                   ar: 'تم التغيير بواسطة' },
  auditAt:         { en: 'Changed At',                   ar: 'وقت التغيير' },
  langEn:          { en: 'English',                      ar: 'الإنجليزية' },
  langAr:          { en: 'Arabic',                       ar: 'العربية' },
  yes:             { en: 'Yes',                          ar: 'نعم' },
  no:              { en: 'No',                           ar: 'لا' },
} as const;

const PERMISSION_ROWS: readonly { code: string; label: L10n<string> }[] = [
  { code: 'oil-analysis:sample:view',     label: { en: 'View Samples',         ar: 'عرض العينات' } },
  { code: 'oil-analysis:sample:import',   label: { en: 'Create Sample',        ar: 'إنشاء عينة' } },
  { code: 'oil-analysis:sample:enter-results', label: { en: 'Edit Sample',     ar: 'تعديل العينة' } },
  { code: 'oil-analysis:sample:approve',  label: { en: 'Approve Sample',       ar: 'اعتماد العينة' } },
  { code: 'oil-analysis:reports:export',  label: { en: 'Export Reports',       ar: 'تصدير التقارير' } },
  { code: 'oil-analysis:settings:manage', label: { en: 'Settings',             ar: 'الإعدادات' } },
  { code: 'oil-analysis:sample:confirm-lp', label: { en: 'Confirm LP Mapping',   ar: 'تأكيد ربط نقطة التشحيم' } },
  { code: 'oil-analysis:reports:view',    label: { en: 'View Reports',         ar: 'عرض التقارير' } },
];

const CONDITION_LEVEL_LABELS: Record<OilAnalysisConditionLevel, L10n<string>> = {
  normal:   COPY.condNormal,
  monitor:  COPY.condMonitor,
  caution:  COPY.condCaution,
  critical: COPY.condCritical,
};

function ToggleField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}): React.ReactElement {
  return (
    <label className="oa-settings-toggle" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export default function ModuleSettings(): React.ReactElement {
  const { locale } = useLanguage();
  const l = (b: L10n<string>) => t(b, locale);
  const sdk = usePlatformSdk();
  const permissions = useOilAnalysisPermissions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<OilAnalysisModuleSettings>(() =>
    oilAnalysisSettingsService.getSettings(),
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);

  const actor = useMemo(() => {
    const user = sdk.auth.getCurrentUser();
    return user?.displayName || user?.userId || 'Administrator';
  }, [sdk]);

  function updateDraft(next: OilAnalysisModuleSettings): void {
    setDraft(next);
    setSaved(false);
    setError(null);
  }

  function handleSave(): void {
    try {
      const updated = oilAnalysisSettingsService.saveSettings(draft, actor);
      setDraft(updated);
      setSaved(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.');
    }
  }

  function handleExport(): void {
    const blob = new Blob([oilAnalysisSettingsService.exportSettingsJson()], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `oil-analysis-settings-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick(): void {
    fileInputRef.current?.click();
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = typeof reader.result === 'string' ? reader.result : '';
        const updated = oilAnalysisSettingsService.importSettingsJson(text, actor);
        setDraft(updated);
        setSaved(true);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Import failed.');
      }
    };
    reader.readAsText(file);
  }

  function handleReset(): void {
    const updated = oilAnalysisSettingsService.resetToDefaults(actor);
    setDraft(updated);
    setSaved(true);
    setShowReset(false);
    setError(null);
  }

  function updateParameter(
    index: number,
    patch: Partial<OilAnalysisParameterSetting>,
  ): void {
    const parameters = draft.parameters.map((p, i) =>
      i === index ? { ...p, ...patch, thresholds: { ...p.thresholds, ...(patch.thresholds ?? {}) } } : p,
    );
    updateDraft({ ...draft, parameters });
  }

  function updateConditionLevel(
    level: OilAnalysisConditionLevel,
    description: string,
  ): void {
    const levels = draft.conditionRules.levels.map((rule) => {
      if (rule.level !== level) return rule;
      return locale === 'ar'
        ? { ...rule, descriptionAr: description }
        : { ...rule, descriptionEn: description };
    });
    updateDraft({ ...draft, conditionRules: { levels } });
  }

  return (
    <div className="ur-page oa-settings-page">
      <header className="ur-page__header">
        <div className="ur-page__header-text">
          <h1 className="ur-page__title">{l(COPY.title)}</h1>
          <p className="ur-page__desc">{l(COPY.desc)}</p>
        </div>
        <StatusChip status="operational" label={l(COPY.liveData)} />
      </header>

      {error && <p className="ur-form-error" role="alert">{error}</p>}
      {saved && !error && <p className="oa-settings-success" role="status">{l(COPY.btnSaved)}</p>}

      <div className="oa-settings-actions">
        <OilAnalysisActionButton
          type="button"
          className="ur-btn ur-btn--primary"
          allowed={permissions.canManageSettings}
          onClick={handleSave}
        >
          {l(COPY.btnSave)}
        </OilAnalysisActionButton>
      </div>

      {/* Section 1 — General Settings */}
      <section className="dashboard-section">
        <h2 className="dashboard-section__title">{l(COPY.secGeneral)}</h2>
        <div className="ol-form-grid">
          <div className="ur-form-field">
            <label className="ur-form-label" htmlFor="oa-def-status">{l(COPY.fldDefStatus)}</label>
            <select
              id="oa-def-status"
              className="ur-form-input"
              value={draft.general.defaultSampleStatus}
              onChange={(e) => updateDraft({
                ...draft,
                general: {
                  ...draft.general,
                  defaultSampleStatus: e.target.value as OilAnalysisModuleSettings['general']['defaultSampleStatus'],
                },
              })}
            >
              <option value="imported">{l(COPY.stImported)}</option>
              <option value="pending-review">{l(COPY.stPending)}</option>
            </select>
          </div>
        </div>
        <div className="oa-settings-toggle-grid">
          <ToggleField
            id="oa-approval-wf"
            label={l(COPY.fldApprovalWf)}
            checked={draft.general.defaultApprovalWorkflowEnabled}
            onChange={(v) => updateDraft({ ...draft, general: { ...draft.general, defaultApprovalWorkflowEnabled: v } })}
          />
          <ToggleField
            id="oa-req-approval"
            label={l(COPY.fldReqApproval)}
            checked={draft.general.requireEngineerApproval}
            onChange={(v) => updateDraft({ ...draft, general: { ...draft.general, requireEngineerApproval: v } })}
          />
          <ToggleField
            id="oa-trend"
            label={l(COPY.fldTrend)}
            checked={draft.general.enableTrendEngine}
            onChange={(v) => updateDraft({ ...draft, general: { ...draft.general, enableTrendEngine: v } })}
          />
          <ToggleField
            id="oa-pdf"
            label={l(COPY.fldPdf)}
            checked={draft.general.enablePdfImport}
            onChange={(v) => updateDraft({ ...draft, general: { ...draft.general, enablePdfImport: v } })}
          />
          <ToggleField
            id="oa-manual"
            label={l(COPY.fldManual)}
            checked={draft.general.enableManualEntry}
            onChange={(v) => updateDraft({ ...draft, general: { ...draft.general, enableManualEntry: v } })}
          />
          <ToggleField
            id="oa-csv"
            label={l(COPY.fldCsv)}
            checked={draft.general.enableCsvExport}
            onChange={(v) => updateDraft({ ...draft, general: { ...draft.general, enableCsvExport: v } })}
          />
          <ToggleField
            id="oa-json-export"
            label={l(COPY.fldJson)}
            checked={draft.general.enableJsonExport}
            onChange={(v) => updateDraft({ ...draft, general: { ...draft.general, enableJsonExport: v } })}
          />
        </div>
      </section>

      {/* Section 2 — Laboratory Settings */}
      <section className="dashboard-section">
        <h2 className="dashboard-section__title">{l(COPY.secLaboratory)}</h2>
        <div className="ol-form-grid">
          <div className="ur-form-field">
            <label className="ur-form-label" htmlFor="oa-lab-name">{l(COPY.fldLab)}</label>
            <input
              id="oa-lab-name"
              className="ur-form-input"
              value={draft.laboratory.defaultLaboratory}
              onChange={(e) => updateDraft({
                ...draft,
                laboratory: { ...draft.laboratory, defaultLaboratory: e.target.value },
              })}
            />
          </div>
          <div className="ur-form-field">
            <label className="ur-form-label" htmlFor="oa-prefix">{l(COPY.fldPrefix)}</label>
            <input
              id="oa-prefix"
              className="ur-form-input"
              value={draft.laboratory.sampleNumberPrefix}
              onChange={(e) => updateDraft({
                ...draft,
                laboratory: { ...draft.laboratory, sampleNumberPrefix: e.target.value.toUpperCase() },
              })}
              maxLength={6}
            />
          </div>
          <div className="ur-form-field">
            <label className="ur-form-label" htmlFor="oa-currency">{l(COPY.fldCurrency)}</label>
            <input
              id="oa-currency"
              className="ur-form-input"
              value={draft.laboratory.defaultCurrency}
              onChange={(e) => updateDraft({
                ...draft,
                laboratory: { ...draft.laboratory, defaultCurrency: e.target.value },
              })}
            />
          </div>
          <div className="ur-form-field">
            <label className="ur-form-label" htmlFor="oa-lang">{l(COPY.fldLang)}</label>
            <select
              id="oa-lang"
              className="ur-form-input"
              value={draft.laboratory.defaultReportLanguage}
              onChange={(e) => updateDraft({
                ...draft,
                laboratory: {
                  ...draft.laboratory,
                  defaultReportLanguage: e.target.value as 'en' | 'ar',
                },
              })}
            >
              <option value="en">{l(COPY.langEn)}</option>
              <option value="ar">{l(COPY.langAr)}</option>
            </select>
          </div>
          <div className="ur-form-field">
            <label className="ur-form-label" htmlFor="oa-unit-ppm">{l(COPY.fldUnitPpm)}</label>
            <input
              id="oa-unit-ppm"
              className="ur-form-input"
              value={draft.laboratory.units.ppm}
              onChange={(e) => updateDraft({
                ...draft,
                laboratory: {
                  ...draft.laboratory,
                  units: { ...draft.laboratory.units, ppm: e.target.value },
                },
              })}
            />
          </div>
          <div className="ur-form-field">
            <label className="ur-form-label" htmlFor="oa-unit-cst">{l(COPY.fldUnitCst)}</label>
            <input
              id="oa-unit-cst"
              className="ur-form-input"
              value={draft.laboratory.units.cSt}
              onChange={(e) => updateDraft({
                ...draft,
                laboratory: {
                  ...draft.laboratory,
                  units: { ...draft.laboratory.units, cSt: e.target.value },
                },
              })}
            />
          </div>
          <div className="ur-form-field">
            <label className="ur-form-label" htmlFor="oa-unit-pct">{l(COPY.fldUnitPct)}</label>
            <input
              id="oa-unit-pct"
              className="ur-form-input"
              value={draft.laboratory.units.percent}
              onChange={(e) => updateDraft({
                ...draft,
                laboratory: {
                  ...draft.laboratory,
                  units: { ...draft.laboratory.units, percent: e.target.value },
                },
              })}
            />
          </div>
          <div className="ur-form-field">
            <label className="ur-form-label" htmlFor="oa-date-fmt">{l(COPY.fldDateFmt)}</label>
            <select
              id="oa-date-fmt"
              className="ur-form-input"
              value={draft.laboratory.dateFormat}
              onChange={(e) => updateDraft({
                ...draft,
                laboratory: {
                  ...draft.laboratory,
                  dateFormat: e.target.value as OilAnalysisModuleSettings['laboratory']['dateFormat'],
                },
              })}
            >
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD-MMM-YYYY">DD-MMM-YYYY</option>
            </select>
          </div>
        </div>
      </section>

      {/* Section 3 — Parameter Settings */}
      <section className="dashboard-section">
        <h2 className="dashboard-section__title">{l(COPY.secParameters)}</h2>
        <p className="oa-settings-hint">{l(COPY.paramHint)}</p>
        <div className="oa-report-table-wrap">
          <table className="ur-table oa-settings-param-table">
            <thead>
              <tr>
                <th>{l(COPY.colParam)}</th>
                <th>{l(COPY.colUnit)}</th>
                <th>{l(COPY.colEnabled)}</th>
                <th>{l(COPY.colMonitor)}</th>
                <th>{l(COPY.colCaution)}</th>
                <th>{l(COPY.colCritical)}</th>
              </tr>
            </thead>
            <tbody>
              {draft.parameters.map((param, index) => (
                <tr key={param.id}>
                  <td>{locale === 'ar' ? param.labelAr : param.labelEn}</td>
                  <td>{param.unit || '—'}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={param.enabled}
                      aria-label={`${locale === 'ar' ? param.labelAr : param.labelEn} enabled`}
                      onChange={(e) => updateParameter(index, { enabled: e.target.checked })}
                    />
                  </td>
                  <td>
                    <input
                      className="ur-form-input oa-settings-threshold"
                      value={formatThreshold(param.thresholds.monitor)}
                      onChange={(e) => updateParameter(index, {
                        thresholds: { ...param.thresholds, monitor: parseThreshold(e.target.value) },
                      })}
                    />
                  </td>
                  <td>
                    <input
                      className="ur-form-input oa-settings-threshold"
                      value={formatThreshold(param.thresholds.caution)}
                      onChange={(e) => updateParameter(index, {
                        thresholds: { ...param.thresholds, caution: parseThreshold(e.target.value) },
                      })}
                    />
                  </td>
                  <td>
                    <input
                      className="ur-form-input oa-settings-threshold"
                      value={formatThreshold(param.thresholds.critical)}
                      onChange={(e) => updateParameter(index, {
                        thresholds: { ...param.thresholds, critical: parseThreshold(e.target.value) },
                      })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 4 — Condition Rules */}
      <section className="dashboard-section">
        <h2 className="dashboard-section__title">{l(COPY.secConditions)}</h2>
        <div className="oa-settings-condition-grid">
          {draft.conditionRules.levels.map((rule) => (
            <div key={rule.level} className="oa-settings-condition-card">
              <h3 className="oa-settings-condition-card__title">
                {l(CONDITION_LEVEL_LABELS[rule.level])}
              </h3>
              <textarea
                className="ur-form-input"
                rows={3}
                value={locale === 'ar' ? rule.descriptionAr : rule.descriptionEn}
                onChange={(e) => updateConditionLevel(rule.level, e.target.value)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Section 5 — Permissions View */}
      <section className="dashboard-section">
        <h2 className="dashboard-section__title">{l(COPY.secPermissions)}</h2>
        <p className="oa-settings-hint">{l(COPY.permReadOnly)}</p>
        <ul className="oa-settings-perm-list">
          {PERMISSION_ROWS.map((row) => (
            <li key={row.code} className="oa-settings-perm-list__item">
              <span className="oa-settings-perm-list__label">{l(row.label)}</span>
              <code className="oa-settings-perm-list__code">{row.code}</code>
            </li>
          ))}
        </ul>
      </section>

      {/* Section 6 — Data Management */}
      <section className="dashboard-section">
        <h2 className="dashboard-section__title">{l(COPY.secData)}</h2>
        <div className="oa-settings-data-actions">
          <button type="button" className="ur-btn ur-btn--secondary" onClick={handleExport}>
            {l(COPY.btnExport)}
          </button>
          <button type="button" className="ur-btn ur-btn--secondary" onClick={handleImportClick}>
            {l(COPY.btnImport)}
          </button>
          <button type="button" className="ur-btn ur-btn--ghost" onClick={() => setShowReset(true)}>
            {l(COPY.btnReset)}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="oa-settings-file-input"
            onChange={handleImportFile}
          />
        </div>
      </section>

      {/* Section 7 — Audit */}
      <section className="dashboard-section">
        <h2 className="dashboard-section__title">{l(COPY.secAudit)}</h2>
        <dl className="oa-settings-audit">
          <div className="oa-settings-audit__row">
            <dt>{l(COPY.auditLast)}</dt>
            <dd>{draft.audit.lastChangeSummary}</dd>
          </div>
          <div className="oa-settings-audit__row">
            <dt>{l(COPY.auditBy)}</dt>
            <dd>{draft.audit.changedBy}</dd>
          </div>
          <div className="oa-settings-audit__row">
            <dt>{l(COPY.auditAt)}</dt>
            <dd>{formatAuditDate(draft.audit.changedAt)}</dd>
          </div>
        </dl>
      </section>

      {showReset && (
        <div
          className="ur-dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="oa-reset-title"
          onClick={() => setShowReset(false)}
        >
          <div className="ur-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="ur-dialog__header">
              <span id="oa-reset-title" className="ur-dialog__title">{l(COPY.resetTitle)}</span>
              <button className="ur-dialog__close" aria-label="Close" onClick={() => setShowReset(false)}>✕</button>
            </div>
            <div className="ur-dialog__body">
              <p>{l(COPY.resetDesc)}</p>
            </div>
            <div className="ur-dialog__footer">
              <button type="button" className="ur-btn ur-btn--primary" onClick={handleReset}>
                {l(COPY.resetConfirm)}
              </button>
              <button type="button" className="ur-btn ur-btn--ghost" onClick={() => setShowReset(false)}>
                {l(COPY.resetCancel)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
