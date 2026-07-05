// apps/owner-center/src/pages/oil-analysis/ModuleSettings.tsx
// OA-009 — Oil Analysis module settings (approved UI freeze).

import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { usePlatformSdk } from '../../context/SdkContext';
import { useOilAnalysisPermissions } from '../../hooks/useOilAnalysisPermissions';
import { OilAnalysisActionButton } from '../../components/oil-analysis/OilAnalysisActionButton';
import {
  PageHeader,
  SectionCard,
  StatusBadge,
  ErrorState,
  useIsMobile,
} from '../../components/ui';
import type {
  OilAnalysisModuleSettings,
  OilAnalysisDashboardWidgetId,
  OilAnalysisOilChangeFrequency,
  OilAnalysisReportExportFormat,
  OilAnalysisSamplingFrequency,
  OilAnalysisTimelineDirection,
  OilAnalysisTimelineEventDensity,
  OilAnalysisWorkflowTriggerStatus,
} from '../../modules/oil-analysis/settings-types';
import { oilAnalysisSettingsService } from '../../modules/oil-analysis/settings.service';

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

const COPY = {
  title: { en: 'Settings', ar: 'الإعدادات' },
  subtitle: {
    en: 'Configure Oil Analysis module behaviour. Branding and notifications inherit from platform settings.',
    ar: 'ضبط سلوك وحدة تحليل الزيت. العلامة التجارية والإشعارات موروثة من إعدادات المنصة.',
  },
  breadcrumbModule: { en: 'Oil Analysis', ar: 'تحليل الزيت' },
  statusCached: { en: 'Cached settings', ar: 'إعدادات مخزنة' },
  btnSave: { en: 'Save Settings', ar: 'حفظ الإعدادات' },
  btnSaved: { en: 'Settings saved.', ar: 'تم حفظ الإعدادات.' },
  inheritedNote: {
    en: 'Inherited from platform App Owner settings',
    ar: 'موروث من إعدادات مالك التطبيق للمنصة',
  },
  futureReady: { en: 'Future-ready', ar: 'جاهز للمستقبل' },

  secPdf: { en: 'PDF Import & OCR', ar: 'استيراد PDF والتعرف الضوئي' },
  secSampling: { en: 'Sampling Rules', ar: 'قواعد أخذ العينات' },
  secWorkflow: { en: 'Automatic Workflow', ar: 'سير العمل التلقائي' },
  secReport: { en: 'Report Settings', ar: 'إعدادات التقارير' },
  secTimeline: { en: 'Timeline Settings', ar: 'إعدادات الجدول الزمني' },
  secDashboard: { en: 'Dashboard Settings', ar: 'إعدادات لوحة المعلومات' },
  secAdvanced: { en: 'Advanced Settings', ar: 'الإعدادات المتقدمة' },
  expandAdvanced: { en: 'Show advanced settings', ar: 'عرض الإعدادات المتقدمة' },
  collapseAdvanced: { en: 'Hide advanced settings', ar: 'إخفاء الإعدادات المتقدمة' },

  enableOcr: { en: 'Enable OCR', ar: 'تفعيل التعرف الضوئي' },
  ocrThreshold: { en: 'OCR Confidence Threshold', ar: 'حد ثقة التعرف الضوئي' },
  duplicateDetection: { en: 'Duplicate Detection (Sample ID)', ar: 'كشف التكرار (معرّف العينة)' },
  maxBatch: { en: 'Maximum Batch Size', ar: 'الحد الأقصى لحجم الدفعة' },
  acceptedTypes: { en: 'Accepted File Types', ar: 'أنواع الملفات المقبولة' },
  driveFolder: { en: 'Google Drive Folder', ar: 'مجلد Google Drive' },
  saveOriginalPdf: { en: 'Save Original PDF', ar: 'حفظ PDF الأصلي' },
  keepPdfVersion: { en: 'Keep Original PDF Version', ar: 'الاحتفاظ بنسخة PDF الأصلية' },

  defaultSamplingFreq: { en: 'Default Sampling Frequency', ar: 'فترة أخذ العينات الافتراضية' },
  autoNextSample: { en: 'Auto Calculate Next Sample', ar: 'حساب العينة التالية تلقائياً' },
  manualOverride: { en: 'Allow Manual Override', ar: 'السماح بالتجاوز اليدوي' },
  autoNextOilChange: { en: 'Auto Calculate Next Oil Change', ar: 'حساب تغيير الزيت التالي تلقائياً' },
  defaultOilChangeFreq: { en: 'Default Oil Change Frequency', ar: 'فترة تغيير الزيت الافتراضية' },
  alertBeforeDue: { en: 'Alert Before Due (Days)', ar: 'تنبيه قبل الاستحقاق (أيام)' },

  autoDraftAction: { en: 'Auto Draft Action', ar: 'إنشاء إجراء مسودة تلقائياً' },
  triggerStatus: { en: 'Trigger Status', ar: 'حالة التفعيل' },
  triggerAlert: { en: 'Alert', ar: 'تنبيه' },
  triggerCautionAlert: { en: 'Caution + Alert', ar: 'حذر + تنبيه' },
  manualAction: { en: 'Manual Action Creation', ar: 'إنشاء إجراء يدوي' },
  notifyEngineer: { en: 'Notify ACC Engineer', ar: 'إشعار مهندس ACC' },
  notifyContractor: { en: 'Notify Contractor', ar: 'إشعار المقاول' },
  enableReviewQueue: { en: 'Enable Review Queue', ar: 'تفعيل قائمة المراجعة' },

  defaultExport: { en: 'Default Export Format', ar: 'تنسيق التصدير الافتراضي' },
  enableCharts: { en: 'Enable Charts', ar: 'تفعيل المخططات' },
  enableHeader: { en: 'Enable Company Header', ar: 'تفعيل ترويسة الشركة' },
  enableFooter: { en: 'Enable Footer', ar: 'تفعيل التذييل' },
  watermark: { en: 'Watermark', ar: 'علامة مائية' },

  timelineDirection: { en: 'Timeline Direction', ar: 'اتجاه الجدول الزمني' },
  timelineLtr: { en: 'Left → Right', ar: 'من اليسار إلى اليمين' },
  timelineRtl: { en: 'Right → Left', ar: 'من اليمين إلى اليسار' },
  showFutureEvents: { en: 'Show Future Events', ar: 'عرض الأحداث المستقبلية' },
  eventDensity: { en: 'Timeline Event Density', ar: 'كثافة أحداث الجدول الزمني' },
  densityCompact: { en: 'Compact', ar: 'مضغوط' },
  densityNormal: { en: 'Normal', ar: 'عادي' },
  densityComfortable: { en: 'Comfortable', ar: 'مريح' },
  defaultZoom: { en: 'Default Timeline Zoom', ar: 'تكبير الجدول الزمني الافتراضي' },

  enableKpi: { en: 'Enable KPI Cards', ar: 'تفعيل بطاقات KPI' },
  visibleWidgets: { en: 'Visible Dashboard Widgets', ar: 'عناصر لوحة المعلومات المرئية' },
  autoRefresh: { en: 'Auto Refresh Interval (minutes)', ar: 'فترة التحديث التلقائي (دقائق)' },
  landingWidget: { en: 'Default Landing Widget', ar: 'عنصر الهبوط الافتراضي' },

  processingTimeout: { en: 'Processing Timeout (seconds)', ar: 'مهلة المعالجة (ثوانٍ)' },
  maxConcurrent: { en: 'Maximum Concurrent Imports', ar: 'الحد الأقصى للاستيراد المتزامن' },
  cacheRefresh: { en: 'Cache Refresh (minutes)', ar: 'تحديث الذاكرة المؤقتة (دقائق)' },
  importLogs: { en: 'Import Logs', ar: 'سجلات الاستيراد' },
  ocrDebug: { en: 'OCR Debug Mode', ar: 'وضع تصحيح التعرف الضوئي' },

  freq30: { en: '30 days', ar: '30 يوماً' },
  freq60: { en: '60 days', ar: '60 يوماً' },
  freq90: { en: '90 days', ar: '90 يوماً' },
  freq180: { en: '180 days', ar: '180 يوماً' },
  freq365: { en: '365 days', ar: '365 يوماً' },
  oil6: { en: '6 months', ar: '6 أشهر' },
  oil12: { en: '12 months', ar: '12 شهراً' },
  oil18: { en: '18 months', ar: '18 شهراً' },
  oil24: { en: '24 months', ar: '24 شهراً' },
  exportPdf: { en: 'PDF', ar: 'PDF' },
  exportExcel: { en: 'Excel', ar: 'Excel' },
  exportBoth: { en: 'PDF + Excel', ar: 'PDF + Excel' },

  widgetImmediate: { en: 'Immediate Attention', ar: 'اهتمام فوري' },
  widgetReview: { en: 'Needs Review', ar: 'يحتاج مراجعة' },
  widgetRecent: { en: 'Recent Activity', ar: 'النشاط الأخير' },
  widgetPriorities: { en: 'Engineering Priorities', ar: 'أولويات الهندسة' },
  widgetCharts: { en: 'Charts', ar: 'المخططات' },
} as const;

const WIDGET_OPTIONS: readonly { id: OilAnalysisDashboardWidgetId; label: L10n<string> }[] = [
  { id: 'immediate-attention', label: COPY.widgetImmediate },
  { id: 'needs-review', label: COPY.widgetReview },
  { id: 'recent-activity', label: COPY.widgetRecent },
  { id: 'engineering-priorities', label: COPY.widgetPriorities },
  { id: 'charts', label: COPY.widgetCharts },
];

function SettingsField({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="acc-settings-field">
      <label className="acc-settings-field__label" htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="acc-settings-field__hint">{hint}</p>}
    </div>
  );
}

function ToggleField({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}): React.ReactElement {
  return (
    <label className="acc-settings-toggle" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="acc-settings-toggle__track" aria-hidden="true" />
      <span className="acc-settings-toggle__label">{label}</span>
    </label>
  );
}

function InheritedBadge({ label }: { label: string }): React.ReactElement {
  return <StatusBadge variant="info" label={label} className="acc-settings-inherited-badge" />;
}

export default function ModuleSettings(): React.ReactElement {
  const { locale } = useLanguage();
  const l = (b: L10n<string>) => t(b, locale);
  const sdk = usePlatformSdk();
  const permissions = useOilAnalysisPermissions();
  const isMobile = useIsMobile();

  const [draft, setDraft] = useState<OilAnalysisModuleSettings>(() =>
    oilAnalysisSettingsService.getSettings(),
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

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

  function toggleWidget(widgetId: OilAnalysisDashboardWidgetId, enabled: boolean): void {
    const current = new Set(draft.dashboard.visibleDashboardWidgets);
    if (enabled) current.add(widgetId);
    else current.delete(widgetId);
    updateDraft({
      ...draft,
      dashboard: {
        ...draft.dashboard,
        visibleDashboardWidgets: WIDGET_OPTIONS
          .map((w) => w.id)
          .filter((id) => current.has(id)),
      },
    });
  }

  const inheritedHint = l(COPY.inheritedNote);

  return (
    <div className="acc-settings-page">
      <PageHeader
        title={l(COPY.title)}
        subtitle={l(COPY.subtitle)}
        breadcrumbs={[
          { label: l(COPY.breadcrumbModule), href: '/oil-analysis' },
          { label: l(COPY.title) },
        ]}
        status={{ variant: 'info', label: l(COPY.statusCached) }}
        actions={(
          <OilAnalysisActionButton
            type="button"
            className="acc-btn acc-btn--primary"
            allowed={permissions.canManageSettings}
            onClick={handleSave}
          >
            {l(COPY.btnSave)}
          </OilAnalysisActionButton>
        )}
      />

      {error && (
        <ErrorState
          title={l(COPY.title)}
          message={error}
          onRetry={() => setError(null)}
        />
      )}

      {!error && saved && (
        <p className="acc-settings-saved" role="status">
          <StatusBadge variant="completed" label={l(COPY.btnSaved)} />
        </p>
      )}

      <div className={`acc-settings-grid${isMobile ? ' acc-settings-grid--single' : ''}`}>
        {/* 1 — PDF Import & OCR */}
        <SectionCard title={l(COPY.secPdf)} bodyClassName="acc-settings-card-body">
          <div className="acc-settings-fields">
            <ToggleField
              id="oa-pdf-ocr"
              label={l(COPY.enableOcr)}
              checked={draft.pdfImport.enableOcr}
              onChange={(v) => updateDraft({
                ...draft,
                pdfImport: { ...draft.pdfImport, enableOcr: v },
                general: { ...draft.general, enablePdfImport: v },
              })}
            />
            <SettingsField id="oa-ocr-threshold" label={l(COPY.ocrThreshold)}>
              <input
                id="oa-ocr-threshold"
                className="acc-settings-input"
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={draft.pdfImport.ocrConfidenceThreshold}
                onChange={(e) => updateDraft({
                  ...draft,
                  pdfImport: {
                    ...draft.pdfImport,
                    ocrConfidenceThreshold: Number.parseFloat(e.target.value) || 0,
                  },
                })}
              />
            </SettingsField>
            <ToggleField
              id="oa-duplicate"
              label={l(COPY.duplicateDetection)}
              checked={draft.pdfImport.duplicateDetectionBySampleId}
              onChange={(v) => updateDraft({
                ...draft,
                pdfImport: { ...draft.pdfImport, duplicateDetectionBySampleId: v },
              })}
            />
            <SettingsField id="oa-batch-size" label={l(COPY.maxBatch)}>
              <input
                id="oa-batch-size"
                className="acc-settings-input"
                type="number"
                min={1}
                max={100}
                value={draft.pdfImport.maximumBatchSize}
                onChange={(e) => updateDraft({
                  ...draft,
                  pdfImport: {
                    ...draft.pdfImport,
                    maximumBatchSize: Number.parseInt(e.target.value, 10) || 1,
                  },
                })}
              />
            </SettingsField>
            <SettingsField id="oa-file-types" label={l(COPY.acceptedTypes)}>
              <input
                id="oa-file-types"
                className="acc-settings-input"
                value={draft.pdfImport.acceptedFileTypes}
                onChange={(e) => updateDraft({
                  ...draft,
                  pdfImport: { ...draft.pdfImport, acceptedFileTypes: e.target.value },
                })}
              />
            </SettingsField>
            <SettingsField id="oa-drive-folder" label={l(COPY.driveFolder)}>
              <input
                id="oa-drive-folder"
                className="acc-settings-input"
                placeholder="Drive folder ID or path"
                value={draft.pdfImport.googleDriveFolder}
                onChange={(e) => updateDraft({
                  ...draft,
                  pdfImport: { ...draft.pdfImport, googleDriveFolder: e.target.value },
                })}
              />
            </SettingsField>
            <ToggleField
              id="oa-save-pdf"
              label={l(COPY.saveOriginalPdf)}
              checked={draft.pdfImport.saveOriginalPdf}
              onChange={(v) => updateDraft({
                ...draft,
                pdfImport: { ...draft.pdfImport, saveOriginalPdf: v },
              })}
            />
            <ToggleField
              id="oa-keep-pdf"
              label={l(COPY.keepPdfVersion)}
              checked={draft.pdfImport.keepOriginalPdfVersion}
              onChange={(v) => updateDraft({
                ...draft,
                pdfImport: { ...draft.pdfImport, keepOriginalPdfVersion: v },
              })}
            />
          </div>
        </SectionCard>

        {/* 2 — Sampling Rules */}
        <SectionCard title={l(COPY.secSampling)} bodyClassName="acc-settings-card-body">
          <div className="acc-settings-fields">
            <SettingsField id="oa-sampling-freq" label={l(COPY.defaultSamplingFreq)}>
              <select
                id="oa-sampling-freq"
                className="acc-settings-input"
                value={draft.samplingRules.defaultSamplingFrequency}
                onChange={(e) => updateDraft({
                  ...draft,
                  samplingRules: {
                    ...draft.samplingRules,
                    defaultSamplingFrequency: e.target.value as OilAnalysisSamplingFrequency,
                  },
                })}
              >
                <option value="30-days">{l(COPY.freq30)}</option>
                <option value="60-days">{l(COPY.freq60)}</option>
                <option value="90-days">{l(COPY.freq90)}</option>
                <option value="180-days">{l(COPY.freq180)}</option>
                <option value="365-days">{l(COPY.freq365)}</option>
              </select>
            </SettingsField>
            <ToggleField
              id="oa-auto-next-sample"
              label={l(COPY.autoNextSample)}
              checked={draft.samplingRules.autoCalculateNextSample}
              onChange={(v) => updateDraft({
                ...draft,
                samplingRules: { ...draft.samplingRules, autoCalculateNextSample: v },
              })}
            />
            <ToggleField
              id="oa-manual-override"
              label={l(COPY.manualOverride)}
              checked={draft.samplingRules.allowManualOverride}
              onChange={(v) => updateDraft({
                ...draft,
                samplingRules: { ...draft.samplingRules, allowManualOverride: v },
              })}
            />
            <ToggleField
              id="oa-auto-oil-change"
              label={l(COPY.autoNextOilChange)}
              checked={draft.samplingRules.autoCalculateNextOilChange}
              onChange={(v) => updateDraft({
                ...draft,
                samplingRules: { ...draft.samplingRules, autoCalculateNextOilChange: v },
              })}
            />
            <SettingsField id="oa-oil-change-freq" label={l(COPY.defaultOilChangeFreq)}>
              <select
                id="oa-oil-change-freq"
                className="acc-settings-input"
                value={draft.samplingRules.defaultOilChangeFrequency}
                onChange={(e) => updateDraft({
                  ...draft,
                  samplingRules: {
                    ...draft.samplingRules,
                    defaultOilChangeFrequency: e.target.value as OilAnalysisOilChangeFrequency,
                  },
                })}
              >
                <option value="6-months">{l(COPY.oil6)}</option>
                <option value="12-months">{l(COPY.oil12)}</option>
                <option value="18-months">{l(COPY.oil18)}</option>
                <option value="24-months">{l(COPY.oil24)}</option>
              </select>
            </SettingsField>
            <SettingsField id="oa-alert-days" label={l(COPY.alertBeforeDue)}>
              <input
                id="oa-alert-days"
                className="acc-settings-input"
                type="number"
                min={0}
                max={90}
                value={draft.samplingRules.alertBeforeDueDays}
                onChange={(e) => updateDraft({
                  ...draft,
                  samplingRules: {
                    ...draft.samplingRules,
                    alertBeforeDueDays: Number.parseInt(e.target.value, 10) || 0,
                  },
                })}
              />
            </SettingsField>
          </div>
        </SectionCard>

        {/* 3 — Automatic Workflow */}
        <SectionCard title={l(COPY.secWorkflow)} bodyClassName="acc-settings-card-body">
          <div className="acc-settings-fields">
            <ToggleField
              id="oa-auto-draft"
              label={l(COPY.autoDraftAction)}
              checked={draft.automaticWorkflow.autoDraftAction}
              onChange={(v) => updateDraft({
                ...draft,
                automaticWorkflow: { ...draft.automaticWorkflow, autoDraftAction: v },
              })}
            />
            <SettingsField id="oa-trigger-status" label={l(COPY.triggerStatus)}>
              <select
                id="oa-trigger-status"
                className="acc-settings-input"
                value={draft.automaticWorkflow.triggerStatus}
                onChange={(e) => updateDraft({
                  ...draft,
                  automaticWorkflow: {
                    ...draft.automaticWorkflow,
                    triggerStatus: e.target.value as OilAnalysisWorkflowTriggerStatus,
                  },
                })}
              >
                <option value="alert">{l(COPY.triggerAlert)}</option>
                <option value="caution-and-alert">{l(COPY.triggerCautionAlert)}</option>
              </select>
            </SettingsField>
            <ToggleField
              id="oa-manual-action"
              label={l(COPY.manualAction)}
              checked={draft.automaticWorkflow.manualActionCreation}
              onChange={(v) => updateDraft({
                ...draft,
                automaticWorkflow: { ...draft.automaticWorkflow, manualActionCreation: v },
              })}
            />
            <div className="acc-settings-field acc-settings-field--inherited">
              <ToggleField
                id="oa-notify-engineer"
                label={l(COPY.notifyEngineer)}
                checked={draft.automaticWorkflow.notifyAccEngineer}
                disabled
                onChange={() => undefined}
              />
              <InheritedBadge label={inheritedHint} />
            </div>
            <div className="acc-settings-field acc-settings-field--inherited">
              <ToggleField
                id="oa-notify-contractor"
                label={l(COPY.notifyContractor)}
                checked={draft.automaticWorkflow.notifyContractor}
                disabled
                onChange={() => undefined}
              />
              <InheritedBadge label={inheritedHint} />
            </div>
            <ToggleField
              id="oa-review-queue"
              label={l(COPY.enableReviewQueue)}
              checked={draft.automaticWorkflow.enableReviewQueue}
              onChange={(v) => updateDraft({
                ...draft,
                automaticWorkflow: { ...draft.automaticWorkflow, enableReviewQueue: v },
                general: {
                  ...draft.general,
                  defaultApprovalWorkflowEnabled: v,
                  requireEngineerApproval: v,
                },
              })}
            />
          </div>
        </SectionCard>

        {/* 4 — Report Settings */}
        <SectionCard title={l(COPY.secReport)} bodyClassName="acc-settings-card-body">
          <div className="acc-settings-fields">
            <SettingsField id="oa-export-format" label={l(COPY.defaultExport)}>
              <select
                id="oa-export-format"
                className="acc-settings-input"
                value={draft.reportSettings.defaultExportFormat}
                onChange={(e) => updateDraft({
                  ...draft,
                  reportSettings: {
                    ...draft.reportSettings,
                    defaultExportFormat: e.target.value as OilAnalysisReportExportFormat,
                  },
                })}
              >
                <option value="pdf">{l(COPY.exportPdf)}</option>
                <option value="excel">{l(COPY.exportExcel)}</option>
                <option value="pdf-excel">{l(COPY.exportBoth)}</option>
              </select>
            </SettingsField>
            <ToggleField
              id="oa-enable-charts"
              label={l(COPY.enableCharts)}
              checked={draft.reportSettings.enableCharts}
              onChange={(v) => updateDraft({
                ...draft,
                reportSettings: { ...draft.reportSettings, enableCharts: v },
              })}
            />
            <div className="acc-settings-field acc-settings-field--inherited">
              <ToggleField
                id="oa-company-header"
                label={l(COPY.enableHeader)}
                checked={draft.reportSettings.enableCompanyHeader}
                disabled
                onChange={() => undefined}
              />
              <InheritedBadge label={inheritedHint} />
            </div>
            <div className="acc-settings-field acc-settings-field--inherited">
              <ToggleField
                id="oa-footer"
                label={l(COPY.enableFooter)}
                checked={draft.reportSettings.enableFooter}
                disabled
                onChange={() => undefined}
              />
              <InheritedBadge label={inheritedHint} />
            </div>
            <div className="acc-settings-field acc-settings-field--inherited">
              <ToggleField
                id="oa-watermark"
                label={l(COPY.watermark)}
                checked={draft.reportSettings.watermark}
                disabled
                onChange={() => undefined}
              />
              <InheritedBadge label={inheritedHint} />
            </div>
          </div>
        </SectionCard>

        {/* 5 — Timeline Settings */}
        <SectionCard title={l(COPY.secTimeline)} bodyClassName="acc-settings-card-body">
          <div className="acc-settings-fields">
            <SettingsField id="oa-timeline-dir" label={l(COPY.timelineDirection)}>
              <select
                id="oa-timeline-dir"
                className="acc-settings-input"
                value={draft.timeline.direction}
                onChange={(e) => updateDraft({
                  ...draft,
                  timeline: {
                    ...draft.timeline,
                    direction: e.target.value as OilAnalysisTimelineDirection,
                  },
                  laboratory: {
                    ...draft.laboratory,
                    timelineDirection: e.target.value as OilAnalysisTimelineDirection,
                  },
                })}
              >
                <option value="ltr">{l(COPY.timelineLtr)}</option>
                <option value="rtl">{l(COPY.timelineRtl)}</option>
              </select>
            </SettingsField>
            <ToggleField
              id="oa-future-events"
              label={l(COPY.showFutureEvents)}
              checked={draft.timeline.showFutureEvents}
              onChange={(v) => updateDraft({
                ...draft,
                timeline: { ...draft.timeline, showFutureEvents: v },
              })}
            />
            <SettingsField id="oa-event-density" label={l(COPY.eventDensity)}>
              <select
                id="oa-event-density"
                className="acc-settings-input"
                value={draft.timeline.eventDensity}
                onChange={(e) => updateDraft({
                  ...draft,
                  timeline: {
                    ...draft.timeline,
                    eventDensity: e.target.value as OilAnalysisTimelineEventDensity,
                  },
                })}
              >
                <option value="compact">{l(COPY.densityCompact)}</option>
                <option value="normal">{l(COPY.densityNormal)}</option>
                <option value="comfortable">{l(COPY.densityComfortable)}</option>
              </select>
            </SettingsField>
            <SettingsField
              id="oa-timeline-zoom"
              label={l(COPY.defaultZoom)}
              hint={l(COPY.futureReady)}
            >
              <input
                id="oa-timeline-zoom"
                className="acc-settings-input"
                type="number"
                min={50}
                max={200}
                step={10}
                value={draft.timeline.defaultTimelineZoom}
                disabled
                readOnly
              />
            </SettingsField>
          </div>
        </SectionCard>

        {/* 6 — Dashboard Settings */}
        <SectionCard title={l(COPY.secDashboard)} bodyClassName="acc-settings-card-body">
          <div className="acc-settings-fields">
            <ToggleField
              id="oa-kpi-cards"
              label={l(COPY.enableKpi)}
              checked={draft.dashboard.enableKpiCards}
              onChange={(v) => updateDraft({
                ...draft,
                dashboard: { ...draft.dashboard, enableKpiCards: v },
              })}
            />
            <div className="acc-settings-field">
              <span className="acc-settings-field__label" id="oa-widgets-label">
                {l(COPY.visibleWidgets)}
              </span>
              <div className="acc-settings-checkbox-group" role="group" aria-labelledby="oa-widgets-label">
                {WIDGET_OPTIONS.map((widget) => (
                  <label key={widget.id} className="acc-settings-checkbox">
                    <input
                      type="checkbox"
                      checked={draft.dashboard.visibleDashboardWidgets.includes(widget.id)}
                      onChange={(e) => toggleWidget(widget.id, e.target.checked)}
                    />
                    <span>{l(widget.label)}</span>
                  </label>
                ))}
              </div>
            </div>
            <SettingsField id="oa-refresh" label={l(COPY.autoRefresh)}>
              <input
                id="oa-refresh"
                className="acc-settings-input"
                type="number"
                min={1}
                max={60}
                value={draft.dashboard.autoRefreshIntervalMinutes}
                onChange={(e) => updateDraft({
                  ...draft,
                  dashboard: {
                    ...draft.dashboard,
                    autoRefreshIntervalMinutes: Number.parseInt(e.target.value, 10) || 1,
                  },
                })}
              />
            </SettingsField>
            <SettingsField id="oa-landing-widget" label={l(COPY.landingWidget)}>
              <select
                id="oa-landing-widget"
                className="acc-settings-input"
                value={draft.dashboard.defaultLandingWidget}
                onChange={(e) => updateDraft({
                  ...draft,
                  dashboard: {
                    ...draft.dashboard,
                    defaultLandingWidget: e.target.value as OilAnalysisDashboardWidgetId,
                  },
                })}
              >
                {WIDGET_OPTIONS.map((widget) => (
                  <option key={widget.id} value={widget.id}>{l(widget.label)}</option>
                ))}
              </select>
            </SettingsField>
          </div>
        </SectionCard>

        {/* 7 — Advanced Settings (collapsed by default) */}
        <SectionCard
          title={l(COPY.secAdvanced)}
          className="acc-settings-advanced-card"
          bodyClassName="acc-settings-card-body"
          actions={(
            <button
              type="button"
              className="acc-btn acc-btn--ghost acc-settings-advanced-toggle"
              aria-expanded={advancedOpen}
              onClick={() => setAdvancedOpen((open) => !open)}
            >
              {advancedOpen ? l(COPY.collapseAdvanced) : l(COPY.expandAdvanced)}
            </button>
          )}
        >
          {advancedOpen ? (
            <div className="acc-settings-fields">
              <SettingsField id="oa-timeout" label={l(COPY.processingTimeout)}>
                <input
                  id="oa-timeout"
                  className="acc-settings-input"
                  type="number"
                  min={30}
                  max={600}
                  value={draft.advanced.processingTimeoutSeconds}
                  onChange={(e) => updateDraft({
                    ...draft,
                    advanced: {
                      ...draft.advanced,
                      processingTimeoutSeconds: Number.parseInt(e.target.value, 10) || 30,
                    },
                  })}
                />
              </SettingsField>
              <SettingsField id="oa-concurrent" label={l(COPY.maxConcurrent)}>
                <input
                  id="oa-concurrent"
                  className="acc-settings-input"
                  type="number"
                  min={1}
                  max={10}
                  value={draft.advanced.maximumConcurrentImports}
                  onChange={(e) => updateDraft({
                    ...draft,
                    advanced: {
                      ...draft.advanced,
                      maximumConcurrentImports: Number.parseInt(e.target.value, 10) || 1,
                    },
                  })}
                />
              </SettingsField>
              <SettingsField id="oa-cache-refresh" label={l(COPY.cacheRefresh)}>
                <input
                  id="oa-cache-refresh"
                  className="acc-settings-input"
                  type="number"
                  min={1}
                  max={120}
                  value={draft.advanced.cacheRefreshMinutes}
                  onChange={(e) => updateDraft({
                    ...draft,
                    advanced: {
                      ...draft.advanced,
                      cacheRefreshMinutes: Number.parseInt(e.target.value, 10) || 1,
                    },
                  })}
                />
              </SettingsField>
              <ToggleField
                id="oa-import-logs"
                label={l(COPY.importLogs)}
                checked={draft.advanced.importLogsEnabled}
                onChange={(v) => updateDraft({
                  ...draft,
                  advanced: { ...draft.advanced, importLogsEnabled: v },
                })}
              />
              <ToggleField
                id="oa-ocr-debug"
                label={l(COPY.ocrDebug)}
                checked={draft.advanced.ocrDebugMode}
                onChange={(v) => updateDraft({
                  ...draft,
                  advanced: { ...draft.advanced, ocrDebugMode: v },
                })}
              />
            </div>
          ) : (
            <p className="acc-settings-advanced-collapsed">{l(COPY.expandAdvanced)}</p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
