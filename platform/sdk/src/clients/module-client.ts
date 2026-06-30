// platform/sdk/src/clients/module-client.ts
// SDK Module Registry client interface.
//
// Business modules consume IModuleClient; they never depend on
// ModuleService directly.  The SDK layer hides the service implementation
// and ensures all module-registry access flows through the approved SDK
// contract.

import type {
  ModuleRecord,
  ModuleStatus,
  ModuleRecordId,
  ModuleHealthStatus,
  ModuleConfigStatus,
  ModuleLocalizationStatus,
  ModuleLearningStatus,
  ModuleSearchStatus,
  ModuleVisibility,
  RegisterModuleRequest,
  UpdateModuleRequest,
  ModuleListQuery,
  ModuleListResult,
} from '@acc-reliability/services';

export type {
  ModuleRecord,
  ModuleStatus,
  ModuleRecordId,
  ModuleHealthStatus,
  ModuleConfigStatus,
  ModuleLocalizationStatus,
  ModuleLearningStatus,
  ModuleSearchStatus,
  ModuleVisibility,
  RegisterModuleRequest,
  UpdateModuleRequest,
  ModuleListQuery,
  ModuleListResult,
};

/**
 * SDK Module Registry client.
 *
 * Provides access to the platform Module Registry domain from business
 * modules and UI shells.  All mutating calls derive the acting user from the
 * current {@link SdkContext} — callers cannot impersonate other users.
 */
export interface IModuleClient {
  // ── Registration & CRUD ───────────────────────────────────────────────────

  /**
   * Registers a new module record.
   * @throws {ModuleDuplicateError} if moduleKey is already registered.
   */
  register(request: RegisterModuleRequest): ModuleRecord;

  /** Returns the module with the given record id, or `null` if not found. */
  findById(id: ModuleRecordId): ModuleRecord | null;

  /** Returns the module with the given business key, or `null`. */
  findByKey(moduleKey: string): ModuleRecord | null;

  /** Returns a paginated list of modules matching the query. */
  list(query?: ModuleListQuery): ModuleListResult;

  /**
   * Updates module profile fields.
   * @throws {ModuleNotFoundError} if the module does not exist.
   */
  update(id: ModuleRecordId, request: UpdateModuleRequest): ModuleRecord;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Enables a disabled module.
   * @throws {ModuleNotFoundError} if not found.
   * @throws {ModuleLifecycleError} if not in disabled status.
   */
  enable(id: ModuleRecordId): ModuleRecord;

  /**
   * Disables an enabled module.
   * @throws {ModuleNotFoundError} if not found.
   * @throws {ModuleLifecycleError} if retired or already disabled.
   */
  disable(id: ModuleRecordId, reason: string): ModuleRecord;

  /**
   * Places an enabled module into maintenance mode.
   * @throws {ModuleNotFoundError} if not found.
   * @throws {ModuleLifecycleError} if not in enabled status.
   */
  startMaintenance(id: ModuleRecordId): ModuleRecord;

  /**
   * Ends maintenance mode and restores the module to enabled.
   * @throws {ModuleNotFoundError} if not found.
   * @throws {ModuleLifecycleError} if not in maintenance status.
   */
  endMaintenance(id: ModuleRecordId): ModuleRecord;

  /**
   * Retires a module.
   * @throws {ModuleNotFoundError} if not found.
   * @throws {ModuleLifecycleError} if already retired.
   */
  retire(id: ModuleRecordId, reason: string): ModuleRecord;

  /**
   * Restores a retired module to enabled status.
   * @throws {ModuleNotFoundError} if not found.
   * @throws {ModuleLifecycleError} if not retired.
   */
  restore(id: ModuleRecordId): ModuleRecord;
}
