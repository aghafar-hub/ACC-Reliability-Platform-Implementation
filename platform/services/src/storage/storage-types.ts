// platform/services/src/storage/storage-types.ts
// Core storage abstraction contracts: provider configuration, ITransaction,
// IRepository<T>, and IStorageProvider.
//
// Design constraints:
//  - IStorageProvider is the single platform entry point for all storage access.
//  - Repository instances are contractor-scoped at creation time; the provider
//    embeds the ContractorId so individual method calls cannot bypass isolation.
//  - ITransaction is future-ready: the interface is fully defined here;
//    providers that do not support transactions (e.g. Google Sheets) throw
//    TransactionError from beginTransaction() — they do not omit the method.
//  - StorageProviderConfig is a discriminated union so new providers can be
//    added without changing existing provider-agnostic code paths.
//  - No implementation logic, no database drivers, no HTTP clients.
//
// Service Registry id reserved: `platform.storage`

import type { ContractorId } from '../auth/auth-types';
import type {
  FilterExpression,
  PageResult,
  PagedQueryOptions,
  QueryOptions,
} from './query-types';

// ── Storage provider kind ─────────────────────────────────────────────────────

/**
 * Discriminant identifying the storage backend.
 *
 *  - `GoogleSheets` — current production data source (Google Sheets via
 *                     Apps Script / Service Account API).
 *  - `SQLServer`    — on-premise SQL Server; future migration target.
 *  - `PostgreSQL`   — cloud-hosted PostgreSQL; future migration target.
 *  - `SQLite`       — local development and integration-test databases.
 *  - `Mock`         — in-memory stub for unit tests and CI pipelines.
 */
export type StorageProviderKind =
  | 'GoogleSheets'
  | 'SQLServer'
  | 'PostgreSQL'
  | 'SQLite'
  | 'Mock';

// ── Provider connection configuration ────────────────────────────────────────

/**
 * Google Sheets connection parameters.
 *
 * `credentialsJson` must be sourced from environment variables or a secret
 * store — never hardcoded.  The service account must have been granted
 * Editor access to the target spreadsheet.
 */
export interface GoogleSheetsProviderConfig {
  readonly kind: 'GoogleSheets';
  /** The `spreadsheetId` segment from the Sheets URL. */
  readonly spreadsheetId: string;
  /**
   * Service account credentials JSON string.
   * Load from an environment variable or secret store; never commit to source.
   */
  readonly credentialsJson: string;
  /**
   * OAuth 2.0 scopes required.  Defaults to
   * `['https://www.googleapis.com/auth/spreadsheets']`.
   */
  readonly scopes?: readonly string[];
  /** API request timeout in milliseconds.  Defaults to 10 000 ms. */
  readonly timeoutMs?: number;
  /** Number of retry attempts for transient API errors.  Defaults to 3. */
  readonly retryAttempts?: number;
}

/**
 * SQL Server (on-premise / Azure SQL) connection parameters.
 *
 * `password` must be sourced from environment variables or a secret store.
 */
export interface SqlServerProviderConfig {
  readonly kind: 'SQLServer';
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly username: string;
  /** Load from environment variables or a secret store; never hardcode. */
  readonly password: string;
  /** Whether to use encrypted connections.  Defaults to `true`. */
  readonly encrypt: boolean;
  /** Connection acquisition timeout in milliseconds. */
  readonly connectionTimeoutMs?: number;
  /** Statement execution timeout in milliseconds. */
  readonly requestTimeoutMs?: number;
  readonly poolMin?: number;
  readonly poolMax?: number;
}

/**
 * PostgreSQL connection parameters.
 *
 * Embed all credentials in `connectionString` via environment variable
 * substitution — never hardcode passwords in source.
 */
export interface PostgreSQLProviderConfig {
  readonly kind: 'PostgreSQL';
  /**
   * Libpq-style connection string, e.g.
   * `postgresql://user:pass@host:5432/dbname`.
   * Source from `process.env.PG_CONNECTION_STRING`.
   */
  readonly connectionString: string;
  readonly poolMin?: number;
  readonly poolMax?: number;
  readonly connectionTimeoutMs?: number;
}

/**
 * SQLite connection parameters.
 *
 * Use `':memory:'` as `filePath` for fully in-memory databases in tests
 * or CI pipelines where persistence is not required.
 */
export interface SQLiteProviderConfig {
  readonly kind: 'SQLite';
  /**
   * Absolute filesystem path to the SQLite database file.
   * Use `':memory:'` for in-memory databases.
   */
  readonly filePath: string;
  /** Open the database in read-only mode.  Defaults to `false`. */
  readonly readOnly?: boolean;
}

/**
 * Mock (in-memory) storage provider configuration.
 *
 * `seedData` is an optional map of entity-type name → seed records.
 * Implementations must deep-clone seed records on provider construction to
 * prevent test pollution between test cases.
 */
export interface MockStorageProviderConfig {
  readonly kind: 'Mock';
  /**
   * Initial data keyed by logical entity type name.
   * Each array element must satisfy the {@link Entity} shape.
   */
  readonly seedData?: Readonly<Record<string, readonly unknown[]>>;
}

/**
 * Discriminated union of all supported provider configurations.
 *
 * Switch on `config.kind` to handle each variant.  Adding a new provider
 * requires a new config interface and a new union member here; business
 * modules never reference this type directly.
 */
export type StorageProviderConfig =
  | GoogleSheetsProviderConfig
  | SqlServerProviderConfig
  | PostgreSQLProviderConfig
  | SQLiteProviderConfig
  | MockStorageProviderConfig;

// ── Storage health status ─────────────────────────────────────────────────────

/** Connectivity state reported by a provider health check. */
export type StorageHealthState = 'healthy' | 'degraded' | 'unavailable';

/**
 * Result of a provider health probe.
 *
 * Safe to include in diagnostic endpoints.  Must never contain credential
 * material (passwords, tokens, connection strings).
 */
export interface StorageHealthStatus {
  readonly state: StorageHealthState;
  readonly providerKind: StorageProviderKind;
  /** ISO 8601 timestamp when this check was performed. */
  readonly checkedAt: string;
  /** Human-readable diagnostic message for operational dashboards. */
  readonly detail?: string;
  /** Round-trip latency of the health probe in milliseconds. */
  readonly latencyMs?: number;
}

// ── Entity base type ──────────────────────────────────────────────────────────

/**
 * Minimum shape that all repository-managed entities must satisfy.
 *
 * `id` is a platform-assigned string identifier unique within the entity
 * type and contractor scope.  Platform modules use type-specific branded IDs
 * (e.g. `EquipmentId`) that extend this shape via structural compatibility.
 */
export interface Entity {
  /** Unique, platform-assigned identifier for this entity instance. */
  readonly id: string;
}

// ── ITransaction ──────────────────────────────────────────────────────────────

/**
 * Handle to an active storage transaction.
 *
 * **Future-ready:** The full interface is defined here; providers that do not
 * support native transactions (e.g. Google Sheets) must still implement
 * `IStorageProvider.beginTransaction()` — they throw {@link TransactionError}
 * to signal lack of support.  This ensures business modules that opt into
 * transactional workflows can be swapped to a SQL backend transparently.
 *
 * Lifecycle:
 *  1. Obtain via {@link IStorageProvider.beginTransaction} or
 *     {@link IStorageProvider.withTransaction}.
 *  2. Pass to repository methods that accept an optional `tx` parameter
 *     (to be introduced in a future milestone when implementations exist).
 *  3. Call {@link commit} on success or {@link rollback} on failure.
 *  4. After commit or rollback, `isActive` is `false`; any further call
 *     throws {@link TransactionError}.
 *
 * Prefer {@link IStorageProvider.withTransaction} over manual
 * begin/commit/rollback to avoid resource leaks on thrown errors.
 */
export interface ITransaction {
  /** Unique transaction identifier; include in logs for correlation. */
  readonly id: string;
  /** ISO 8601 timestamp when the transaction was opened. */
  readonly startedAt: string;
  /** `true` while the transaction has neither been committed nor rolled back. */
  readonly isActive: boolean;

  /**
   * Commits all changes made within this transaction.
   *
   * @throws {@link TransactionError} if the transaction is no longer active.
   */
  commit(): Promise<void>;

  /**
   * Rolls back all changes made within this transaction.
   *
   * Safe to call even if a previous `commit()` failed; does nothing if the
   * transaction is already inactive.
   *
   * @throws {@link TransactionError} if the rollback itself fails at the
   *   provider level (rare; indicates a serious infrastructure problem).
   */
  rollback(): Promise<void>;
}

// ── IRepository<T> ────────────────────────────────────────────────────────────

/**
 * Contractor-scoped repository providing CRUD and query operations for a
 * single entity type `T`.
 *
 * Instances are obtained exclusively via
 * {@link IStorageProvider.getRepository}; the `ContractorId` is fixed at
 * creation time and silently applied to every read and write operation.
 * Methods must never return data belonging to a different contractor.
 *
 * All methods are asynchronous.  Prefer {@link findPaged} over {@link findAll}
 * for large collections to avoid loading unbounded result sets into memory.
 *
 * @typeParam T - Entity type managed by this repository.  Must extend
 *   {@link Entity} so that the `id` field is always present.
 */
export interface IRepository<T extends Entity> {
  /**
   * Returns the entity with the given `id`, or `null` if no such entity
   * exists within the contractor scope.
   */
  findById(id: string): Promise<T | null>;

  /**
   * Returns all entities matching the given {@link QueryOptions} within the
   * contractor scope.
   *
   * When no options are provided, all entities are returned in an
   * implementation-defined order.  Avoid calling without `options.page` on
   * large collections; use {@link findPaged} instead.
   */
  findAll(options?: QueryOptions<T>): Promise<readonly T[]>;

  /**
   * Returns a single page of entities matching the given
   * {@link PagedQueryOptions}.
   *
   * The returned {@link PageResult} includes total count and page metadata so
   * callers can render pagination controls without a separate count query.
   */
  findPaged(options: PagedQueryOptions<T>): Promise<PageResult<T>>;

  /**
   * Returns the first entity satisfying `filter` within the contractor scope,
   * or `null` if no match exists.
   *
   * When multiple entities match, the one returned is implementation-defined.
   * Use an `eq` filter on a unique field to get deterministic results.
   */
  findOne(filter: FilterExpression<T>): Promise<T | null>;

  /**
   * Persists a new entity and returns the saved entity with its
   * platform-assigned `id` and any provider-generated fields.
   *
   * @throws {@link DuplicateEntityError} if a unique constraint is violated.
   * @throws {@link StorageError} for provider-level write failures.
   */
  create(data: Omit<T, 'id'>): Promise<T>;

  /**
   * Applies `changes` to the entity with the given `id` and returns the
   * fully updated entity.
   *
   * Only fields present in `changes` are modified; absent fields are left
   * unchanged (partial update semantics).
   *
   * @throws {@link EntityNotFoundError} if no entity with `id` exists in the
   *   contractor scope.
   * @throws {@link StorageError} for provider-level write failures.
   */
  update(id: string, changes: Partial<Omit<T, 'id'>>): Promise<T>;

  /**
   * Permanently removes the entity with the given `id`.
   *
   * @throws {@link EntityNotFoundError} if no entity with `id` exists in the
   *   contractor scope.
   * @throws {@link StorageError} for provider-level write failures.
   */
  delete(id: string): Promise<void>;

  /**
   * Returns the number of entities matching `filter` within the contractor
   * scope.  Omitting `filter` returns the total entity count.
   */
  count(filter?: FilterExpression<T>): Promise<number>;

  /**
   * Returns `true` if an entity with `id` exists within the contractor scope.
   *
   * Prefer this over `findById(id) !== null` when the entity data is not
   * needed, as implementations may issue a cheaper existence probe.
   */
  exists(id: string): Promise<boolean>;
}

// ── IStorageProvider ──────────────────────────────────────────────────────────

/**
 * Central access point for all platform storage operations.
 *
 * A single provider instance is registered in the Service Registry under
 * `platform.storage`.  Business modules never instantiate providers directly;
 * they resolve the provider from the registry and call
 * {@link getRepository} to obtain contractor-scoped repository instances.
 *
 * Lifecycle:
 *  1. Provider is created with a {@link StorageProviderConfig}.
 *  2. {@link connect} is called during platform bootstrap.
 *  3. Modules obtain contractor-scoped repositories via {@link getRepository}.
 *  4. {@link disconnect} is called during graceful platform shutdown.
 *
 * Design invariants:
 *  - One provider instance per platform deployment.
 *  - Repository instances are contractor-scoped; cross-contractor data
 *    leakage is impossible through the repository API.
 *  - The service id `platform.storage` is reserved; no registration occurs
 *    in this milestone (no implementation exists yet).
 *  - SQL migration (Phase 12) replaces the provider implementation; business
 *    modules require no changes because they depend on this interface only.
 *
 * Future: when Phase 9 (Event Bus) is active, implementations may optionally
 * publish storage events to `platform.events.storage.*`.  This interface does
 * not change; event publishing is an implementation-level concern.
 */
export interface IStorageProvider {
  /** The kind of storage backend this provider connects to. */
  readonly kind: StorageProviderKind;

  /**
   * `true` after a successful {@link connect} call and before
   * {@link disconnect}.
   */
  readonly isConnected: boolean;

  /**
   * Establishes the connection to the storage backend.
   *
   * Safe to call multiple times; subsequent calls are no-ops when the
   * provider is already connected.
   *
   * @throws {@link ConnectionError} if the connection cannot be established.
   */
  connect(): Promise<void>;

  /**
   * Closes all open connections and releases resources.
   *
   * Safe to call when not connected.  After disconnect,
   * {@link getRepository} calls throw {@link StorageError}.
   */
  disconnect(): Promise<void>;

  /**
   * Returns a contractor-scoped {@link IRepository} for entity type `T`.
   *
   * `entityType` is the stable logical name for the entity (e.g.
   * `'equipment'`, `'measurement'`, `'oilSample'`).  Implementations map
   * this name to their native construct (sheet tab name, table name, etc.).
   *
   * The returned repository enforces that all reads and writes are scoped to
   * `contractorId` and must never return data belonging to other contractors.
   *
   * @param entityType   Logical entity type name; stable across migrations.
   * @param contractorId Contractor whose data is accessed.
   * @throws {@link StorageError} if the provider is not connected.
   */
  getRepository<T extends Entity>(
    entityType: string,
    contractorId: ContractorId
  ): IRepository<T>;

  /**
   * Opens a new transaction and returns the {@link ITransaction} handle.
   *
   * Providers that do not support native transactions (e.g. Google Sheets)
   * must throw {@link TransactionError} — they must not omit this method.
   * This ensures business modules can be migrated to a transactional backend
   * without changing the call site.
   *
   * Callers must always call {@link ITransaction.commit} or
   * {@link ITransaction.rollback}.  Prefer {@link withTransaction} to avoid
   * resource leaks when exceptions are thrown.
   *
   * @throws {@link TransactionError} if the provider does not support
   *   transactions or if the transaction cannot be started.
   */
  beginTransaction(): Promise<ITransaction>;

  /**
   * Convenience wrapper: opens a transaction, runs `operation`, commits on
   * success, and rolls back automatically if `operation` throws.
   *
   * @param operation Async callback that receives the active transaction.
   * @returns The value returned by `operation`.
   * @throws The original error from `operation` after rolling back.
   * @throws {@link TransactionError} if the provider does not support
   *   transactions.
   */
  withTransaction<TResult>(
    operation: (tx: ITransaction) => Promise<TResult>
  ): Promise<TResult>;

  /**
   * Performs a lightweight connectivity probe and returns the current health
   * state.
   *
   * This method must never throw; all failure conditions are reported
   * in the returned {@link StorageHealthStatus}.
   */
  healthCheck(): Promise<StorageHealthStatus>;
}
