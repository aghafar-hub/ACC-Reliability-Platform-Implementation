// modules/oil-analysis/src/index.ts
// Public API surface for @acc-reliability/oil-analysis.

export type { OilSampleId } from './types';
export { createOilSampleId } from './types';

export type {
  OilSampleStatus,
  OilSampleImportSource,
  OilSampleResultStatus,
  OilSample,
  OilSampleCreateRequest,
  OilSampleUpdateRequest,
} from './types';

export {
  OIL_ANALYSIS_PERMISSIONS,
} from './permissions';
export type { OilAnalysisPermission } from './permissions';

export {
  OIL_ANALYSIS_ENTITY_TYPES,
} from './entity-types';
export type { OilAnalysisEntityType } from './entity-types';

export { OIL_ANALYSIS_MANIFEST } from './manifest';
