// apps/owner-center/src/modules/oil-analysis/settings-types.ts
// Oil Analysis module administration settings model.
//
// Stored separately from sample data — configuration only.

/** Default status applied when registering a new sample. */
export type OilAnalysisDefaultSampleStatus = 'imported' | 'pending-review';

/** Supported report / UI language codes. */
export type OilAnalysisReportLanguage = 'en' | 'ar';

/** Canonical oil analysis parameter identifiers. */
export type OilAnalysisParameterId =
  | 'iron'
  | 'copper'
  | 'silicon'
  | 'water'
  | 'pqIndex'
  | 'viscosity'
  | 'tan'
  | 'oxidation'
  | 'particleCount';

/** Condition level used in lab result assessment. */
export type OilAnalysisConditionLevel = 'normal' | 'monitor' | 'caution' | 'critical';

/** Date display format preference. */
export type OilAnalysisDateFormat =
  | 'YYYY-MM-DD'
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY'
  | 'DD-MMM-YYYY';

/** Combined timeline flow direction (OA-007 / OA-009). */
export type OilAnalysisTimelineDirection = 'ltr' | 'rtl';

/** Auto-draft action trigger scope (OA-009). */
export type OilAnalysisWorkflowTriggerStatus = 'alert' | 'caution-and-alert';

/** Timeline event density (OA-009). */
export type OilAnalysisTimelineEventDensity = 'compact' | 'normal' | 'comfortable';

/** Default report export format (OA-009). */
export type OilAnalysisReportExportFormat = 'pdf' | 'excel' | 'pdf-excel';

/** Sampling frequency preset (OA-009). */
export type OilAnalysisSamplingFrequency =
  | '30-days'
  | '60-days'
  | '90-days'
  | '180-days'
  | '365-days';

/** Oil change frequency preset (OA-009). */
export type OilAnalysisOilChangeFrequency =
  | '6-months'
  | '12-months'
  | '18-months'
  | '24-months';

/** Dashboard widget identifiers (OA-009). */
export type OilAnalysisDashboardWidgetId =
  | 'immediate-attention'
  | 'needs-review'
  | 'recent-activity'
  | 'engineering-priorities'
  | 'charts';

/** Numeric thresholds for a single parameter (monitor → caution → critical). */
export interface OilAnalysisParameterThresholds {
  readonly monitor: number | null;
  readonly caution: number | null;
  readonly critical: number | null;
}

/** Per-parameter visibility and threshold configuration. */
export interface OilAnalysisParameterSetting {
  readonly id: OilAnalysisParameterId;
  readonly labelEn: string;
  readonly labelAr: string;
  readonly unit: string;
  readonly enabled: boolean;
  readonly thresholds: OilAnalysisParameterThresholds;
}

/** Descriptive rule for a condition level. */
export interface OilAnalysisConditionLevelRule {
  readonly level: OilAnalysisConditionLevel;
  readonly descriptionEn: string;
  readonly descriptionAr: string;
}

/** Legacy general module toggles — retained for guards and downstream services. */
export interface OilAnalysisGeneralSettings {
  readonly defaultSampleStatus: OilAnalysisDefaultSampleStatus;
  readonly defaultApprovalWorkflowEnabled: boolean;
  readonly requireEngineerApproval: boolean;
  readonly enableTrendEngine: boolean;
  readonly enablePdfImport: boolean;
  readonly enableManualEntry: boolean;
  readonly enableCsvExport: boolean;
  readonly enableJsonExport: boolean;
}

/** Legacy laboratory preferences — retained for lab workflows. */
export interface OilAnalysisLaboratorySettings {
  readonly defaultLaboratory: string;
  readonly sampleNumberPrefix: string;
  /** Reserved for future billing / cost reporting. */
  readonly defaultCurrency: string;
  readonly defaultReportLanguage: OilAnalysisReportLanguage;
  readonly units: {
    readonly ppm: string;
    readonly cSt: string;
    readonly percent: string;
  };
  readonly dateFormat: OilAnalysisDateFormat;
  /**
   * @deprecated Use `timeline.direction`. Kept for localStorage migration only.
   */
  readonly timelineDirection: OilAnalysisTimelineDirection;
}

/** OA-009 — PDF Import & OCR settings. */
export interface OilAnalysisPdfImportSettings {
  readonly enableOcr: boolean;
  readonly ocrConfidenceThreshold: number;
  readonly duplicateDetectionBySampleId: boolean;
  readonly maximumBatchSize: number;
  readonly acceptedFileTypes: string;
  readonly googleDriveFolder: string;
  readonly saveOriginalPdf: boolean;
  readonly keepOriginalPdfVersion: boolean;
}

/** OA-009 — Sampling rules. */
export interface OilAnalysisSamplingRulesSettings {
  readonly defaultSamplingFrequency: OilAnalysisSamplingFrequency;
  readonly autoCalculateNextSample: boolean;
  readonly allowManualOverride: boolean;
  readonly autoCalculateNextOilChange: boolean;
  readonly defaultOilChangeFrequency: OilAnalysisOilChangeFrequency;
  readonly alertBeforeDueDays: number;
}

/** OA-009 — Automatic workflow. */
export interface OilAnalysisAutomaticWorkflowSettings {
  readonly autoDraftAction: boolean;
  readonly triggerStatus: OilAnalysisWorkflowTriggerStatus;
  readonly manualActionCreation: boolean;
  readonly notifyAccEngineer: boolean;
  readonly notifyContractor: boolean;
  readonly enableReviewQueue: boolean;
}

/** OA-009 — Report settings (branding inherited from platform). */
export interface OilAnalysisReportSettings {
  readonly defaultExportFormat: OilAnalysisReportExportFormat;
  readonly enableCharts: boolean;
  readonly enableCompanyHeader: boolean;
  readonly enableFooter: boolean;
  readonly watermark: boolean;
}

/** OA-009 — Timeline settings. */
export interface OilAnalysisTimelineSettings {
  readonly direction: OilAnalysisTimelineDirection;
  readonly showFutureEvents: boolean;
  readonly eventDensity: OilAnalysisTimelineEventDensity;
  /** Future-ready — reserved for zoom presets. */
  readonly defaultTimelineZoom: number;
}

/** OA-009 — Dashboard settings. */
export interface OilAnalysisDashboardSettings {
  readonly enableKpiCards: boolean;
  readonly visibleDashboardWidgets: readonly OilAnalysisDashboardWidgetId[];
  readonly autoRefreshIntervalMinutes: number;
  readonly defaultLandingWidget: OilAnalysisDashboardWidgetId;
}

/** OA-009 — Advanced settings. */
export interface OilAnalysisAdvancedSettings {
  readonly processingTimeoutSeconds: number;
  readonly maximumConcurrentImports: number;
  readonly cacheRefreshMinutes: number;
  readonly importLogsEnabled: boolean;
  readonly ocrDebugMode: boolean;
}

/** Condition rule descriptions (thresholds live on parameters). */
export interface OilAnalysisConditionRules {
  readonly levels: readonly OilAnalysisConditionLevelRule[];
}

/** Last settings change audit metadata. */
export interface OilAnalysisSettingsAudit {
  readonly lastChangeSummary: string;
  readonly changedBy: string;
  readonly changedAt: string;
}

/** Complete Oil Analysis module settings document. */
export interface OilAnalysisModuleSettings {
  readonly general: OilAnalysisGeneralSettings;
  readonly laboratory: OilAnalysisLaboratorySettings;
  readonly pdfImport: OilAnalysisPdfImportSettings;
  readonly samplingRules: OilAnalysisSamplingRulesSettings;
  readonly automaticWorkflow: OilAnalysisAutomaticWorkflowSettings;
  readonly reportSettings: OilAnalysisReportSettings;
  readonly timeline: OilAnalysisTimelineSettings;
  readonly dashboard: OilAnalysisDashboardSettings;
  readonly advanced: OilAnalysisAdvancedSettings;
  readonly parameters: readonly OilAnalysisParameterSetting[];
  readonly conditionRules: OilAnalysisConditionRules;
  readonly audit: OilAnalysisSettingsAudit;
}
