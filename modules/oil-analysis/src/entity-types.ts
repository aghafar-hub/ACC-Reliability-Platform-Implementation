// modules/oil-analysis/src/entity-types.ts
// Entity type string constants for the Oil Analysis module.

/**
 * Entity type constants for the Oil Analysis module.
 *
 * Pass these to `sdk.storage.getRepository<T>(entityType)` at module
 * initialisation time. Never use raw string literals for entity types.
 */
export const OIL_ANALYSIS_ENTITY_TYPES = {
  /** Entity type for {@link OilSample} storage. */
  OIL_SAMPLE: 'oilSample',

  /** Entity type for lab result value storage. */
  OIL_SAMPLE_RESULT: 'oilSampleResult',

  /** Entity type for parameter definition storage. */
  OIL_SAMPLE_PARAMETER: 'oilSampleParameter',

  /** Entity type for action plans triggered by caution/alert results. */
  OIL_ANALYSIS_ACTION_PLAN: 'oilAnalysisActionPlan',

  /** Entity type for PDF import records with OCR output. */
  PDF_IMPORT: 'pdfImport',
} as const;

/** Union type of all valid Oil Analysis entity type strings. */
export type OilAnalysisEntityType =
  (typeof OIL_ANALYSIS_ENTITY_TYPES)[keyof typeof OIL_ANALYSIS_ENTITY_TYPES];
