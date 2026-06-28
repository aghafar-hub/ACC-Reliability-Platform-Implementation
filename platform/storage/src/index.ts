// platform/storage/src/index.ts
// Public API surface for @acc-reliability/storage.
//
// Re-exports the core storage contracts from @acc-reliability/services so
// consumers can import everything storage-related from one package.
// Adds the storage adapter layer (WriteResult, ContractorScopeFilter,
// Google Sheets adapter) that lives above the abstract interfaces.

// ── Core contracts (re-exported from services) ────────────────────────────────

export type {
  StorageProviderKind,
  GoogleSheetsProviderConfig,
  SqlServerProviderConfig,
  PostgreSQLProviderConfig,
  SQLiteProviderConfig,
  MockStorageProviderConfig,
  StorageProviderConfig,
  StorageHealthState,
  StorageHealthStatus,
  Entity,
  ITransaction,
  IRepository,
  IStorageProvider,
} from '@acc-reliability/services';

export type {
  FilterOperator,
  FieldFilter,
  CompositeFilter,
  FilterExpression,
  SortDirection,
  SortClause,
  PageRequest,
  PageResult,
  QueryOptions,
  PagedQueryOptions,
} from '@acc-reliability/services';

// ── Write result ──────────────────────────────────────────────────────────────

export type { WriteResultKind, WriteResult } from './write-result';

// ── Contractor scope filter ───────────────────────────────────────────────────

export type {
  ScopeType,
  GlobalScope,
  ContractorScope,
  DenyScope,
  ContractorScopeFilter,
} from './contractor-scope';

export {
  globalScope,
  contractorScope,
  denyScope,
  isGlobalScope,
  isContractorScope,
  isDenyScope,
} from './contractor-scope';

// ── Google Sheets adapter ─────────────────────────────────────────────────────

export type {
  GoogleSheetsReadResult,
  IGoogleSheetsAdapter,
} from './adapters/google-sheets-adapter';

export { GoogleSheetsAdapterStub } from './adapters/google-sheets-adapter';
