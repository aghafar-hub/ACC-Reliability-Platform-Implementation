// modules/oil-analysis/src/permissions.ts
// Typed permission action constants for the Oil Analysis module.
//
// Format: '<moduleId>:<domain>:<action>'

/**
 * Typed permission action constants for the Oil Analysis module.
 */
export const OIL_ANALYSIS_PERMISSIONS = {
  /** View oil analysis samples and lab results. */
  VIEW_SAMPLE: 'oil-analysis:sample:view',

  /** Import or create oil analysis samples (manual / future PDF). */
  IMPORT_SAMPLE: 'oil-analysis:sample:import',

  /** Confirm lubrication point mapping on a sample. */
  CONFIRM_LP: 'oil-analysis:sample:confirm-lp',

  /** Enter or confirm lab analysis results. */
  ENTER_RESULTS: 'oil-analysis:sample:enter-results',

  /** View and generate oil analysis reports. */
  VIEW_REPORTS: 'oil-analysis:reports:view',

  /** Export oil analysis reports. */
  EXPORT_REPORTS: 'oil-analysis:reports:export',

  /** View and configure module settings. */
  MANAGE_SETTINGS: 'oil-analysis:settings:manage',
} as const;

/** Union type of all valid Oil Analysis permission action strings. */
export type OilAnalysisPermission =
  (typeof OIL_ANALYSIS_PERMISSIONS)[keyof typeof OIL_ANALYSIS_PERMISSIONS];
