// platform/services/src/contractor/contractor-types.ts
// Contractor domain entity, DTOs, repository and service contracts.
//
// Design:
//   - ContractorRecord is the platform's authoritative stored contractor entity.
//     A contractor represents an operating organization (ACC, RHI, ASEC, or any
//     future partner) with its own scope, branding, and area assignments.
//
//   - ContractorStatus lifecycle:
//       active   → deactivate → inactive
//       inactive → activate   → active
//       active | inactive → archive → archived
//       archived → restore → active
//
//   - ActorRef is the same lightweight principal reference used by the User domain.
//
// Service id reserved: platform.contractors

import type { UserId, ContractorId } from '../auth/auth-types';
import type { ActorRef } from '../user/user-types';

// Re-export ActorRef so consumers of contractor-types can use it without
// importing from user-types directly.
export type { ActorRef };

// ── ContractorStatus ──────────────────────────────────────────────────────────

/** Ordered tuple of all valid contractor lifecycle states. */
export const CONTRACTOR_STATUSES = ['active', 'inactive', 'archived'] as const;

/** Lifecycle state of a contractor organization. */
export type ContractorStatus = typeof CONTRACTOR_STATUSES[number];

// ── ContractorRecordId ────────────────────────────────────────────────────────

declare const ContractorRecordIdBrand: unique symbol;

/**
 * Branded string that uniquely identifies a ContractorRecord.
 * Use {@link generateContractorRecordId} to produce values.
 */
export type ContractorRecordId = string & { readonly [ContractorRecordIdBrand]: 'ContractorRecordId' };

/** Generates a platform-unique {@link ContractorRecordId}. */
export function generateContractorRecordId(): ContractorRecordId {
  const ts  = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 11);
  return `ctr-${ts}-${rnd}` as ContractorRecordId;
}

/** Creates a {@link ContractorRecordId} from a plain string. @throws {Error} if blank. */
export function createContractorRecordId(value: string): ContractorRecordId {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error('ContractorRecordId cannot be empty');
  return trimmed as ContractorRecordId;
}

// ── EquipmentScope ────────────────────────────────────────────────────────────

/** Equipment scope structure (structure only — details to be refined in later phases). */
export interface EquipmentScope {
  /** Free-form list of equipment categories in scope for this contractor. */
  readonly categories: readonly string[];
  /** Optional human-readable notes about the scope. */
  readonly notes?: string;
}

// ── ContractorRecord ──────────────────────────────────────────────────────────

/**
 * Authoritative platform contractor entity.
 *
 * Invariants:
 *  - id is unique across the entire platform.
 *  - contractorCode is unique (corresponds to the branded ContractorId space).
 *  - All fields are readonly — mutations produce new records (immutable update pattern).
 *  - Archived contractors cannot be activated or deactivated until restored.
 */
export interface ContractorRecord {
  /** Internal platform record identifier. */
  readonly id: ContractorRecordId;
  /** Organizational code (ACC, RHI, ASEC, etc.) — unique business key. */
  readonly contractorCode: ContractorId;
  /** Full legal or display name of the contractor organization. */
  readonly name: string;
  /** Short display name (abbreviation). */
  readonly shortName: string;
  /** Current lifecycle status. */
  readonly status: ContractorStatus;
  /** Primary contact email address for the contractor organization. */
  readonly email: string;
  /** Contact phone number. */
  readonly phone?: string;
  /** Name of the primary contact person at the contractor organization. */
  readonly contactPerson?: string;
  /** Maintenance areas owned by this contractor. */
  readonly areasOwned: readonly string[];
  /** Equipment scope (structure only). */
  readonly equipmentScope: EquipmentScope;
  readonly createdAt: string;
  readonly createdBy: UserId;
  readonly updatedAt: string;
  readonly updatedBy: UserId;
  readonly archivedAt?: string;
  readonly archivedBy?: UserId;
  readonly archivedReason?: string;
  readonly restoredAt?: string;
  readonly restoredBy?: UserId;
  readonly activatedAt?: string;
  readonly activatedBy?: UserId;
  readonly deactivatedAt?: string;
  readonly deactivatedBy?: UserId;
  readonly deactivatedReason?: string;
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

/** Fields required to create a new contractor record. */
export interface CreateContractorRequest {
  /**
   * Optional explicit record id. If omitted, {@link generateContractorRecordId} is used.
   */
  readonly id?: ContractorRecordId;
  /** Unique organizational code. Must map to a valid ContractorId scope. */
  readonly contractorCode: ContractorId;
  readonly name: string;
  readonly shortName: string;
  readonly email: string;
  readonly phone?: string;
  readonly contactPerson?: string;
  readonly areasOwned?: readonly string[];
  readonly equipmentScope?: EquipmentScope;
  readonly reason?: string;
}

/** Profile fields that may be updated on an existing contractor record. */
export interface UpdateContractorRequest {
  readonly name?: string;
  readonly shortName?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly contactPerson?: string;
  readonly areasOwned?: readonly string[];
  readonly equipmentScope?: EquipmentScope;
  readonly reason?: string;
}

/** Filter criteria for listing contractor records. */
export interface ContractorListQuery {
  /** Filter by lifecycle status. */
  readonly status?: ContractorStatus;
  /** Full-text search against name, shortName, contractorCode. */
  readonly searchText?: string;
  /** Number of records to skip (pagination). Defaults to 0. */
  readonly offset?: number;
  /** Maximum number of records to return. Defaults to 50. */
  readonly limit?: number;
}

/** Paginated result from a contractor list operation. */
export interface ContractorListResult {
  readonly contractors: readonly ContractorRecord[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
}

// ── IContractorRepository ─────────────────────────────────────────────────────

/**
 * Contractor repository contract — raw data access layer.
 *
 * No business rules are enforced here; enforcement is the responsibility of
 * {@link IContractorService}.
 *
 * Service id reserved: `platform.contractors.repository`
 */
export interface IContractorRepository {
  /**
   * Stores a new contractor record.
   * @throws {Error} if id or contractorCode is already taken.
   */
  save(contractor: ContractorRecord): ContractorRecord;

  /**
   * Replaces an existing contractor record.
   * @throws {Error} if id is not found.
   */
  update(contractor: ContractorRecord): ContractorRecord;

  /** Returns the contractor with the given record id, or `null` if not found. */
  findById(id: ContractorRecordId): ContractorRecord | null;

  /** Returns the contractor with the given organizational code, or `null` if not found. */
  findByCode(contractorCode: ContractorId): ContractorRecord | null;

  /** Returns a paginated list of contractors matching the supplied filter. */
  list(query?: ContractorListQuery): ContractorListResult;

  /** Returns the total number of stored contractors. */
  count(): number;

  /**
   * Hard-deletes a contractor record.
   * Reserved for integration tests — production lifecycle uses archive.
   */
  remove(id: ContractorRecordId): boolean;
}

// ── IContractorService ────────────────────────────────────────────────────────

/**
 * Contractor Management Service contract.
 *
 * Owns the full contractor lifecycle: create, update, activate, deactivate,
 * archive, restore.
 *
 * Every mutation:
 *  - Writes an audit record via the platform audit service.
 *  - Publishes a domain event via the platform event bus.
 *    (NullEventBus in Phase 1 — real delivery in Phase 9.)
 *
 * Service id reserved for registration: `platform.contractors`
 */
export interface IContractorService {
  // ── CRUD ─────────────────────────────────────────────────────────────────

  /**
   * Creates a new contractor record and publishes {@link ContractorCreatedEvent}.
   * @throws {ContractorDuplicateError} if contractorCode is already registered.
   */
  create(request: CreateContractorRequest, actor: ActorRef): ContractorRecord;

  /** Returns the contractor with the given record id, or `null` if not found. */
  findById(id: ContractorRecordId): ContractorRecord | null;

  /** Returns the contractor with the given organizational code, or `null`. */
  findByCode(contractorCode: ContractorId): ContractorRecord | null;

  /** Returns a paginated list of contractors matching the query. */
  list(query?: ContractorListQuery): ContractorListResult;

  /**
   * Updates contractor profile fields and publishes {@link ContractorUpdatedEvent}.
   * @throws {ContractorNotFoundError} if the contractor does not exist.
   */
  update(id: ContractorRecordId, request: UpdateContractorRequest, actor: ActorRef): ContractorRecord;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Archives a contractor. Publishes {@link ContractorArchivedEvent}.
   * @throws {ContractorNotFoundError} if the contractor does not exist.
   * @throws {ContractorLifecycleError} if the contractor is already archived.
   */
  archive(id: ContractorRecordId, reason: string, actor: ActorRef): ContractorRecord;

  /**
   * Restores an archived contractor to active status. Publishes {@link ContractorRestoredEvent}.
   * @throws {ContractorNotFoundError} if the contractor does not exist.
   * @throws {ContractorLifecycleError} if the contractor is not archived.
   */
  restore(id: ContractorRecordId, actor: ActorRef): ContractorRecord;

  /**
   * Activates an inactive contractor. Publishes {@link ContractorActivatedEvent}.
   * @throws {ContractorNotFoundError} if the contractor does not exist.
   * @throws {ContractorLifecycleError} if the contractor is not inactive.
   */
  activate(id: ContractorRecordId, actor: ActorRef): ContractorRecord;

  /**
   * Deactivates an active contractor. Publishes {@link ContractorDeactivatedEvent}.
   * @throws {ContractorNotFoundError} if the contractor does not exist.
   * @throws {ContractorLifecycleError} if the contractor is archived or already inactive.
   */
  deactivate(id: ContractorRecordId, reason: string, actor: ActorRef): ContractorRecord;
}
