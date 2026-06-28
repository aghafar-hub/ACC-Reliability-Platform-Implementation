// modules/oil-lubrication/src/types.ts
// Domain types for the Oil Lubrication module.
//
// All types are pure data contracts — no methods, no classes.
// Repository and service interfaces depend on these types only.
//
// Key identifiers:
//   EquipmentId        — master platform equipment key (Equipment_ID)
//   LubricationPointId — physical lubrication point on a piece of equipment (LP_ID)
//   OilChangeRecordId  — unique identifier for a single oil change record

import type { IsoTimestamp } from '@acc-reliability/shared-types';
import type {
  ContractorId,
  UserId,
  Entity,
  QueryOptions,
  PagedQueryOptions,
  PageResult,
} from '@acc-reliability/sdk';
import type { EquipmentId } from '@acc-reliability/services';

// ── Branded identifiers ───────────────────────────────────────────────────────

/** Unique identifier for a single oil change record. */
export type OilChangeRecordId = string & { readonly __brand: 'OilChangeRecordId' };

/**
 * Lubrication Point identifier (LP_ID).
 *
 * Identifies a specific physical lubrication point on a piece of equipment.
 * A single equipment unit may have multiple lubrication points.
 */
export type LubricationPointId = string & { readonly __brand: 'LubricationPointId' };

/**
 * Creates an {@link OilChangeRecordId} from a raw string.
 * @throws {Error} if value is empty after trimming.
 */
export function createOilChangeRecordId(value: string): OilChangeRecordId {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error('OilChangeRecordId cannot be empty');
  return trimmed as OilChangeRecordId;
}

/**
 * Creates a {@link LubricationPointId} from a raw string.
 * @throws {Error} if value is empty after trimming.
 */
export function createLubricationPointId(value: string): LubricationPointId {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error('LubricationPointId cannot be empty');
  return trimmed as LubricationPointId;
}

// ── Oil Change Record entity ──────────────────────────────────────────────────

/**
 * Represents a single oil change event performed on a piece of equipment.
 *
 * Contractor isolation is enforced at the repository layer; every query is
 * scoped to the {@link contractorId} embedded in the repository instance.
 * This entity always belongs to exactly one contractor.
 */
export interface OilChangeRecord extends Entity {
  /** Platform-assigned unique identifier. */
  readonly id: string;
  /** Equipment on which the oil change was performed (master Equipment_ID). */
  readonly equipmentId: EquipmentId;
  /** Contractor that owns this record. */
  readonly contractorId: ContractorId;
  /**
   * Lubrication Point identifier (LP_ID).
   * Present when the equipment has named lubrication points.
   */
  readonly lubricationPointId?: LubricationPointId | undefined;
  /** Oil type or grade applied (e.g. "ISO VG 46", "Shell Omala S2 G 220"). */
  readonly oilType: string;
  /** Volume of oil applied, in litres. */
  readonly quantityLitres: number;
  /** ISO 8601 UTC timestamp when the oil change was performed in the field. */
  readonly performedAt: IsoTimestamp;
  /** Platform user who recorded the completion. */
  readonly completedBy: UserId;
  /** Optional maintenance work order reference. */
  readonly workOrderId?: string | undefined;
  /** Optional technician notes. */
  readonly notes?: string | undefined;
  /** ISO 8601 UTC timestamp when this record was created in the platform. */
  readonly createdAt: IsoTimestamp;
  /** ISO 8601 UTC timestamp when this record was last modified. */
  readonly updatedAt: IsoTimestamp;
}

// ── Create request ────────────────────────────────────────────────────────────

/** Input payload for recording a new oil change event. */
export interface OilChangeRecordCreateRequest {
  readonly equipmentId: EquipmentId;
  readonly contractorId: ContractorId;
  readonly lubricationPointId?: LubricationPointId | undefined;
  readonly oilType: string;
  readonly quantityLitres: number;
  readonly performedAt: IsoTimestamp;
  readonly completedBy: UserId;
  readonly workOrderId?: string | undefined;
  readonly notes?: string | undefined;
}

// ── Update request ────────────────────────────────────────────────────────────

/**
 * Partial update payload for an existing oil change record.
 * Only fields present in this object are modified; absent fields are unchanged.
 * Identity fields (id, equipmentId, contractorId, completedBy) cannot be updated.
 */
export interface OilChangeRecordUpdateRequest {
  readonly oilType?: string;
  readonly quantityLitres?: number;
  readonly performedAt?: IsoTimestamp;
  readonly workOrderId?: string;
  readonly notes?: string;
}

// ── Summary projection ────────────────────────────────────────────────────────

/** Lightweight read model for rendering oil change record lists. */
export interface OilChangeRecordSummary {
  readonly id: string;
  readonly equipmentId: EquipmentId;
  readonly lubricationPointId?: LubricationPointId | undefined;
  readonly oilType: string;
  readonly quantityLitres: number;
  readonly performedAt: IsoTimestamp;
  readonly completedBy: UserId;
}

// ── Repository interface ──────────────────────────────────────────────────────

/**
 * Domain repository for oil change records.
 *
 * Instances are contractor-scoped; contractor isolation is enforced by the
 * storage layer at repository creation time via {@link IStorageClient.getRepository}.
 * Individual method calls do not require a {@link ContractorId} parameter.
 */
export interface IOilLubricationRepository {
  findById(id: string): Promise<OilChangeRecord | null>;
  findByEquipmentId(
    equipmentId: EquipmentId,
    options?: QueryOptions<OilChangeRecord>
  ): Promise<readonly OilChangeRecord[]>;
  findPaged(options: PagedQueryOptions<OilChangeRecord>): Promise<PageResult<OilChangeRecord>>;
  create(data: Omit<OilChangeRecord, 'id'>): Promise<OilChangeRecord>;
  update(id: string, changes: OilChangeRecordUpdateRequest): Promise<OilChangeRecord>;
  delete(id: string): Promise<void>;
}
