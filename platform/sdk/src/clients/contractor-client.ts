// platform/sdk/src/clients/contractor-client.ts
// SDK Contractor Management client interface.
//
// Business modules consume IContractorClient; they never depend on
// ContractorService directly.  The SDK layer hides the service implementation
// and ensures all contractor-management access flows through the approved SDK
// contract.
//
// IContractorClient exposes a thin subset of IContractorService:
//   - read operations open to any module
//   - write operations require the caller to be a platform-level actor

import type { ContractorId } from '@acc-reliability/services';
import type {
  ContractorRecord,
  ContractorStatus,
  ContractorRecordId,
  EquipmentScope,
  CreateContractorRequest,
  UpdateContractorRequest,
  ContractorListQuery,
  ContractorListResult,
} from '@acc-reliability/services';

export type {
  ContractorRecord,
  ContractorStatus,
  ContractorRecordId,
  EquipmentScope,
  CreateContractorRequest,
  UpdateContractorRequest,
  ContractorListQuery,
  ContractorListResult,
};

/**
 * SDK Contractor Management client.
 *
 * Provides access to the platform Contractor Management domain from business
 * modules and UI shells.  All mutating calls derive the acting user from the
 * current {@link SdkContext} — callers cannot impersonate other users.
 */
export interface IContractorClient {
  // ── CRUD ─────────────────────────────────────────────────────────────────

  /**
   * Creates a new contractor record.
   * @throws {ContractorDuplicateError} if contractorCode is already registered.
   */
  create(request: CreateContractorRequest): ContractorRecord;

  /** Returns the contractor with the given record id, or `null` if not found. */
  findById(id: ContractorRecordId): ContractorRecord | null;

  /** Returns the contractor with the given organizational code, or `null`. */
  findByCode(contractorCode: ContractorId): ContractorRecord | null;

  /** Returns a paginated list of contractors matching the query. */
  list(query?: ContractorListQuery): ContractorListResult;

  /**
   * Updates contractor profile fields.
   * @throws {ContractorNotFoundError} if the contractor does not exist.
   */
  update(id: ContractorRecordId, request: UpdateContractorRequest): ContractorRecord;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Archives a contractor.
   * @throws {ContractorNotFoundError} if not found.
   * @throws {ContractorLifecycleError} if already archived.
   */
  archive(id: ContractorRecordId, reason: string): ContractorRecord;

  /**
   * Restores an archived contractor to active status.
   * @throws {ContractorNotFoundError} if not found.
   * @throws {ContractorLifecycleError} if not archived.
   */
  restore(id: ContractorRecordId): ContractorRecord;

  /**
   * Activates an inactive contractor.
   * @throws {ContractorNotFoundError} if not found.
   * @throws {ContractorLifecycleError} if not inactive.
   */
  activate(id: ContractorRecordId): ContractorRecord;

  /**
   * Deactivates an active contractor.
   * @throws {ContractorNotFoundError} if not found.
   * @throws {ContractorLifecycleError} if archived or already inactive.
   */
  deactivate(id: ContractorRecordId, reason: string): ContractorRecord;
}
