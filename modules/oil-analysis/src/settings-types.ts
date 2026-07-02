// modules/oil-analysis/src/settings-types.ts
// Module administration settings model for Oil Analysis.
//
// Stored separately from sample data — configuration only.

import type { IsoTimestamp } from '@acc-reliability/shared-types';

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

/** Section 1 — general module toggles and defaults. */
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

/** Section 2 — laboratory and display preferences. */
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
}

/** Section 4 — condition rule descriptions (thresholds live on parameters). */
export interface OilAnalysisConditionRules {
  readonly levels: readonly OilAnalysisConditionLevelRule[];
}

/** Section 7 — last settings change audit metadata. */
export interface OilAnalysisSettingsAudit {
  readonly lastChangeSummary: string;
  readonly changedBy: string;
  readonly changedAt: IsoTimestamp;
}

/** Complete Oil Analysis module settings document. */
export interface OilAnalysisModuleSettings {
  readonly general: OilAnalysisGeneralSettings;
  readonly laboratory: OilAnalysisLaboratorySettings;
  readonly parameters: readonly OilAnalysisParameterSetting[];
  readonly conditionRules: OilAnalysisConditionRules;
  readonly audit: OilAnalysisSettingsAudit;
}
