// modules/oil-lubrication/src/index.ts
// Public API surface for @acc-reliability/oil-lubrication.
//
// Only what is exported here is part of the module's public contract.
// Internal implementation files (repository adapter, private helpers) that
// are re-exported here become public; the rest remain private.

// ── Branded identifiers ───────────────────────────────────────────────────────
export type { OilChangeRecordId, LubricationPointId } from './types';
export { createOilChangeRecordId, createLubricationPointId } from './types';

// ── Status / source / frequency ───────────────────────────────────────────────
export type { OilChangeStatus, OilChangeSource, OilChangeFrequency } from './types';

// ── Lubrication Point entity and requests ─────────────────────────────────────
export type {
  LubricationPoint,
  LubricationPointCreateRequest,
  LubricationPointUpdateRequest,
} from './types';

// ── Oil Change Record entity and requests ─────────────────────────────────────
export type {
  OilChangeRecord,
  OilChangeRecordCreateRequest,
  OilChangeRecordUpdateRequest,
  OilChangeRecordSummary,
} from './types';

// ── Repository contracts ──────────────────────────────────────────────────────
export type { IOilChangeRecordRepository, ILubricationPointRepository } from './types';

// ── Domain errors ─────────────────────────────────────────────────────────────
export {
  OilLubricationError,
  OilRecordNotFoundError,
  OilRecordValidationError,
} from './errors';

// ── Repository adapter and entity type constant ───────────────────────────────
export {
  OilLubricationRepository,
  OIL_CHANGE_RECORD_ENTITY_TYPE,
} from './oil-lubrication.repository';

// ── Oil change service ────────────────────────────────────────────────────────
export { OilLubricationService } from './oil-lubrication.service';

// ── Lubrication point service (Sprint 02) ─────────────────────────────────────
export { LubricationPointService } from './lubrication-point.service';

// ── Module manifest and factory ───────────────────────────────────────────────
export { OIL_LUBRICATION_MANIFEST, createOilLubricationService } from './manifest';
