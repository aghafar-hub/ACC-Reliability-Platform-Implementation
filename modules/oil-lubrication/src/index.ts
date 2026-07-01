// modules/oil-lubrication/src/index.ts
// Public API surface for @acc-reliability/oil-lubrication.
//
// Only what is exported here is part of the module's public contract.
// Internal implementation files (repository adapter, private helpers) that
// are re-exported here become public; the rest remain private.
//
// Sprint 03 additions:
//   - AttachmentReference value object
//   - LpStatusBucket type
//   - OIL_LUBRICATION_PERMISSIONS constants (permissions.ts)
//   - OIL_LUBRICATION_ENTITY_TYPES constants (entity-types.ts)
//   - SchedulingService (scheduling.service.ts)
//   - OIL_LUBRICATION_ERROR_CODES typed constants
//   - cancelRecord() is now the replacement for the removed deleteRecord()

// ── Branded identifiers ───────────────────────────────────────────────────────
export type { OilChangeRecordId, LubricationPointId } from './types';
export { createOilChangeRecordId, createLubricationPointId } from './types';

// ── Status / source / frequency ───────────────────────────────────────────────
export type { OilChangeStatus, OilChangeSource, OilChangeFrequency } from './types';

// ── LP status bucket (Sprint 03) ──────────────────────────────────────────────
export type { LpStatusBucket } from './types';

// ── Attachment reference value object (Sprint 03) ─────────────────────────────
export type { AttachmentReference } from './types';

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
export { OilLubricationService, OIL_LUBRICATION_ERROR_CODES } from './oil-lubrication.service';

// ── Lubrication point service ─────────────────────────────────────────────────
export { LubricationPointService } from './lubrication-point.service';

// ── Scheduling service (Sprint 03) ────────────────────────────────────────────
export { SchedulingService } from './scheduling.service';

// ── Permission constants (Sprint 03) ─────────────────────────────────────────
export {
  OIL_LUBRICATION_PERMISSIONS,
} from './permissions';
export type { OilLubricationPermission } from './permissions';

// ── Entity type constants (Sprint 03) ─────────────────────────────────────────
export {
  OIL_LUBRICATION_ENTITY_TYPES,
} from './entity-types';
export type { OilLubricationEntityType } from './entity-types';

// ── Module manifest and factory ───────────────────────────────────────────────
export { OIL_LUBRICATION_MANIFEST, createOilLubricationService } from './manifest';
