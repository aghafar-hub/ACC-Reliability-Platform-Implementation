// platform/services/src/module/module-types.ts
// Module Registry domain entity, DTOs, repository and service contracts.
//
// Design:
//   - ModuleRecord is the platform's authoritative stored module entity.
//     A module represents an installed platform capability (User Management,
//     Contractor Management, Workflow Engine, etc.).
//
//   - ModuleStatus lifecycle:
//       (register) → enabled
//       enabled    → disable    → disabled
//       disabled   → enable     → enabled
//       enabled    → startMaintenance → maintenance
//       maintenance → endMaintenance  → enabled
//       enabled | disabled | maintenance → retire → retired
//       retired    → restore    → enabled
//
// Service id reserved: platform.modules

import type { UserId, ContractorId } from '../auth/auth-types';
import type { ActorRef } from '../user/user-types';

export type { UserId, ContractorId, ActorRef };

// ── ModuleStatus ───────────────────────────────────────────────────────────────

/** Ordered tuple of all valid module lifecycle states. */
export const MODULE_STATUSES = ['enabled', 'disabled', 'maintenance', 'retired'] as const;

/** Lifecycle state of a platform module. */
export type ModuleStatus = typeof MODULE_STATUSES[number];

// ── Supporting status types ────────────────────────────────────────────────────

/** Operational health status of a module. */
export type ModuleHealthStatus    = 'healthy' | 'degraded' | 'offline' | 'unknown';

/** Configuration completeness of a module. */
export type ModuleConfigStatus    = 'configured' | 'partial' | 'unconfigured';

/** Localization readiness of a module. */
export type ModuleLocalizationStatus = 'ready' | 'partial' | 'none';

/** Learning content readiness of a module. */
export type ModuleLearningStatus  = 'ready' | 'pending' | 'none';

/** Search index status of a module. */
export type ModuleSearchStatus    = 'indexed' | 'pending' | 'none';

/** Visibility of a module to end users. */
export type ModuleVisibility      = 'visible' | 'hidden';

// ── ModuleRecordId ─────────────────────────────────────────────────────────────

declare const ModuleRecordIdBrand: unique symbol;

/**
 * Branded string that uniquely identifies a ModuleRecord.
 * Use {@link generateModuleRecordId} to produce values.
 */
export type ModuleRecordId = string & { readonly [ModuleRecordIdBrand]: 'ModuleRecordId' };

/** Generates a platform-unique {@link ModuleRecordId}. */
export function generateModuleRecordId(): ModuleRecordId {
  const ts  = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 11);
  return `mod-${ts}-${rnd}` as ModuleRecordId;
}

/** Creates a {@link ModuleRecordId} from a plain string. @throws {Error} if blank. */
export function createModuleRecordId(value: string): ModuleRecordId {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error('ModuleRecordId cannot be empty');
  return trimmed as ModuleRecordId;
}

// ActorRef is re-exported from user-types (see import above).
// The alias here is intentional — module-types consumers use ActorRef without
// importing from user-types directly.

// ── ModuleRecord ──────────────────────────────────────────────────────────────

/**
 * Authoritative platform module entity.
 *
 * Invariants:
 *  - id is unique across the entire platform.
 *  - moduleKey is unique — it is the human-readable business identifier.
 *  - All fields are readonly — mutations produce new records (immutable update pattern).
 *  - Retired modules cannot be enabled, disabled, or placed in maintenance until restored.
 */
export interface ModuleRecord {
  /** Internal platform record identifier. */
  readonly id: ModuleRecordId;
  /** Unique module business key (e.g. 'user-management', 'contractor-management'). */
  readonly moduleKey: string;
  /** Full display name of the module. */
  readonly name: string;
  /** Semantic version string (e.g. '1.0.0'). */
  readonly version: string;
  /** Module category (e.g. 'Core', 'Operations', 'Analytics'). */
  readonly category: string;
  /** Current lifecycle status. */
  readonly status: ModuleStatus;
  /** Operational health status. */
  readonly healthStatus: ModuleHealthStatus;
  /** Configuration completeness status. */
  readonly configStatus: ModuleConfigStatus;
  /** Localization readiness status. */
  readonly localizationStatus: ModuleLocalizationStatus;
  /** Learning content readiness status. */
  readonly learningStatus: ModuleLearningStatus;
  /** Search index status. */
  readonly searchStatus: ModuleSearchStatus;
  /** End-user visibility. */
  readonly visibility: ModuleVisibility;
  /** Whether the module is currently in maintenance mode. */
  readonly maintenanceMode: boolean;
  /** Module keys this module depends on. */
  readonly dependencies: readonly string[];
  /** ISO 8601 timestamp when the module was first installed. */
  readonly installedDate: string;
  readonly createdAt: string;
  readonly createdBy: UserId;
  readonly updatedAt: string;
  readonly updatedBy: UserId;
  readonly enabledAt?: string;
  readonly enabledBy?: UserId;
  readonly disabledAt?: string;
  readonly disabledBy?: UserId;
  readonly disabledReason?: string;
  readonly maintenanceStartedAt?: string;
  readonly maintenanceStartedBy?: UserId;
  readonly maintenanceEndedAt?: string;
  readonly maintenanceEndedBy?: UserId;
  readonly retiredAt?: string;
  readonly retiredBy?: UserId;
  readonly retiredReason?: string;
  readonly restoredAt?: string;
  readonly restoredBy?: UserId;
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

/** Fields required to register a new module record. */
export interface RegisterModuleRequest {
  /** Optional explicit record id. If omitted, {@link generateModuleRecordId} is used. */
  readonly id?: ModuleRecordId;
  /** Unique module business key. */
  readonly moduleKey: string;
  readonly name: string;
  readonly version: string;
  readonly category: string;
  readonly healthStatus?: ModuleHealthStatus;
  readonly configStatus?: ModuleConfigStatus;
  readonly localizationStatus?: ModuleLocalizationStatus;
  readonly learningStatus?: ModuleLearningStatus;
  readonly searchStatus?: ModuleSearchStatus;
  readonly visibility?: ModuleVisibility;
  readonly dependencies?: readonly string[];
  readonly reason?: string;
}

/** Profile fields that may be updated on an existing module record. */
export interface UpdateModuleRequest {
  readonly name?: string;
  readonly version?: string;
  readonly category?: string;
  readonly healthStatus?: ModuleHealthStatus;
  readonly configStatus?: ModuleConfigStatus;
  readonly localizationStatus?: ModuleLocalizationStatus;
  readonly learningStatus?: ModuleLearningStatus;
  readonly searchStatus?: ModuleSearchStatus;
  readonly visibility?: ModuleVisibility;
  readonly dependencies?: readonly string[];
  readonly reason?: string;
}

/** Filter criteria for listing module records. */
export interface ModuleListQuery {
  /** Filter by lifecycle status. */
  readonly status?: ModuleStatus;
  /** Full-text search against name, moduleKey, category. */
  readonly searchText?: string;
  /** Number of records to skip (pagination). Defaults to 0. */
  readonly offset?: number;
  /** Maximum number of records to return. Defaults to 50. */
  readonly limit?: number;
}

/** Paginated result from a module list operation. */
export interface ModuleListResult {
  readonly modules: readonly ModuleRecord[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
}

// ── IModuleRepository ─────────────────────────────────────────────────────────

/**
 * Module repository contract — raw data access layer.
 *
 * No business rules are enforced here; enforcement is the responsibility of
 * {@link IModuleService}.
 *
 * Service id reserved: `platform.modules.repository`
 */
export interface IModuleRepository {
  /**
   * Stores a new module record.
   * @throws {Error} if id or moduleKey is already taken.
   */
  save(module: ModuleRecord): ModuleRecord;

  /**
   * Replaces an existing module record.
   * @throws {Error} if id is not found.
   */
  update(module: ModuleRecord): ModuleRecord;

  /** Returns the module with the given record id, or `null` if not found. */
  findById(id: ModuleRecordId): ModuleRecord | null;

  /** Returns the module with the given business key, or `null` if not found. */
  findByKey(moduleKey: string): ModuleRecord | null;

  /** Returns a paginated list of modules matching the supplied filter. */
  list(query?: ModuleListQuery): ModuleListResult;

  /** Returns the total number of stored modules. */
  count(): number;

  /**
   * Hard-deletes a module record.
   * Reserved for integration tests — production lifecycle uses retire.
   */
  remove(id: ModuleRecordId): boolean;
}

// ── IModuleService ────────────────────────────────────────────────────────────

/**
 * Module Registry Service contract.
 *
 * Owns the full module lifecycle: register, update, enable, disable,
 * startMaintenance, endMaintenance, retire, restore.
 *
 * Every mutation:
 *  - Writes an audit record via the platform audit service.
 *  - Publishes a domain event via the platform event bus.
 *    (NullEventBus in Phase 1 — real delivery in Phase 9.)
 *
 * Service id reserved for registration: `platform.modules`
 */
export interface IModuleService {
  // ── Registration & CRUD ───────────────────────────────────────────────────

  /**
   * Registers a new module record and publishes {@link ModuleRegisteredPayload}.
   * @throws {ModuleDuplicateError} if moduleKey is already registered.
   */
  register(request: RegisterModuleRequest, actor: ActorRef): ModuleRecord;

  /** Returns the module with the given record id, or `null` if not found. */
  findById(id: ModuleRecordId): ModuleRecord | null;

  /** Returns the module with the given business key, or `null`. */
  findByKey(moduleKey: string): ModuleRecord | null;

  /** Returns a paginated list of modules matching the query. */
  list(query?: ModuleListQuery): ModuleListResult;

  /**
   * Updates module profile fields and publishes {@link ModuleUpdatedPayload}.
   * @throws {ModuleNotFoundError} if the module does not exist.
   */
  update(id: ModuleRecordId, request: UpdateModuleRequest, actor: ActorRef): ModuleRecord;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Enables a disabled module. Publishes {@link ModuleEnabledPayload}.
   * @throws {ModuleNotFoundError} if not found.
   * @throws {ModuleLifecycleError} if not in disabled status.
   */
  enable(id: ModuleRecordId, actor: ActorRef): ModuleRecord;

  /**
   * Disables an enabled module. Publishes {@link ModuleDisabledPayload}.
   * @throws {ModuleNotFoundError} if not found.
   * @throws {ModuleLifecycleError} if retired or already disabled.
   */
  disable(id: ModuleRecordId, reason: string, actor: ActorRef): ModuleRecord;

  /**
   * Places an enabled module into maintenance mode. Publishes {@link ModuleMaintenanceStartedPayload}.
   * @throws {ModuleNotFoundError} if not found.
   * @throws {ModuleLifecycleError} if not in enabled status.
   */
  startMaintenance(id: ModuleRecordId, actor: ActorRef): ModuleRecord;

  /**
   * Ends maintenance mode and restores the module to enabled. Publishes {@link ModuleMaintenanceEndedPayload}.
   * @throws {ModuleNotFoundError} if not found.
   * @throws {ModuleLifecycleError} if not in maintenance status.
   */
  endMaintenance(id: ModuleRecordId, actor: ActorRef): ModuleRecord;

  /**
   * Retires a module. Publishes {@link ModuleRetiredPayload}.
   * @throws {ModuleNotFoundError} if not found.
   * @throws {ModuleLifecycleError} if already retired.
   */
  retire(id: ModuleRecordId, reason: string, actor: ActorRef): ModuleRecord;

  /**
   * Restores a retired module to enabled status. Publishes {@link ModuleRestoredPayload}.
   * @throws {ModuleNotFoundError} if not found.
   * @throws {ModuleLifecycleError} if not retired.
   */
  restore(id: ModuleRecordId, actor: ActorRef): ModuleRecord;
}
