// modules/oil-lubrication/src/entity-types.ts
// Entity type string constants for the Oil Lubrication module.
//
// These constants are passed to sdk.storage.getRepository<T>(entityType)
// to obtain a contractor-scoped IRepository instance. They must remain
// stable across storage provider migrations — changing an entity type key
// orphans stored data.
//
// Sprint 03 scope: oil change records and lubrication points.
// Future entities (routes, samples) will be added in their respective sprints.

/**
 * Entity type constants for the Oil Lubrication module.
 *
 * Pass these to `sdk.storage.getRepository<T>(entityType)` at module
 * initialisation time. Never use raw string literals for entity types.
 *
 * @example
 * const repo = sdk.storage.getRepository<OilChangeRecord>(
 *   OIL_LUBRICATION_ENTITY_TYPES.OIL_CHANGE_RECORD
 * );
 */
export const OIL_LUBRICATION_ENTITY_TYPES = {
  /**
   * Entity type for {@link OilChangeRecord} storage.
   * Stable key — do not rename after data has been written.
   */
  OIL_CHANGE_RECORD: 'oilChangeRecord',

  /**
   * Entity type for {@link LubricationPoint} storage.
   * Stable key — do not rename after data has been written.
   */
  LUBRICATION_POINT: 'lubricationPoint',
} as const;

/** Union type of all valid Oil Lubrication entity type strings. */
export type OilLubricationEntityType =
  (typeof OIL_LUBRICATION_ENTITY_TYPES)[keyof typeof OIL_LUBRICATION_ENTITY_TYPES];
