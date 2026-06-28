// platform/storage/src/contractor-scope.ts
// Contractor scope model for storage access control.
//
// Every storage read/write carries a ContractorScopeFilter.
// The scope type determines what data the caller is permitted to see:
//
//   GLOBAL     — ACC platform administrators; sees all contractor data.
//   CONTRACTOR — RHI, ASEC, or any single contractor; data is isolated to
//                the declared contractorId.  Cross-contractor reads are
//                blocked at the repository level.
//   DENY       — Access explicitly denied; no read or write is permitted.
//                Used for unauthenticated requests, expired sessions, or
//                invalid authorization state.
//
// Design:
//  - scopeType is the discriminant; switch on it rather than checking
//    contractorId for null/undefined.
//  - contractorId is only meaningful (and required) when scopeType is
//    'CONTRACTOR'; it is absent for GLOBAL and DENY scopes.
//  - The model is intentionally flat — no nested permission objects — so
//    it can be cheaply passed on every repository call.

// ── Scope type discriminant ───────────────────────────────────────────────────

/**
 * Discriminant controlling data visibility for a storage operation.
 *
 *  - `'GLOBAL'`     — Caller holds platform-wide access (ACC AppOwner role).
 *                     Repositories return data across all contractors.
 *  - `'CONTRACTOR'` — Caller is scoped to a single contractor.
 *                     Repositories silently restrict results to that
 *                     contractor; cross-contractor data is never returned.
 *  - `'DENY'`       — Caller has no valid authorization.
 *                     Repositories must reject all operations immediately.
 */
export type ScopeType = 'GLOBAL' | 'CONTRACTOR' | 'DENY';

// ── ContractorScopeFilter variants ───────────────────────────────────────────

/** Global scope — ACC platform administrator; all contractors visible. */
export interface GlobalScope {
  readonly scopeType: 'GLOBAL';
  readonly contractorId?: undefined;
}

/**
 * Contractor scope — data access restricted to a single contractor.
 *
 * `contractorId` is the normalized contractor code (e.g. `'ACC'`, `'RHI'`,
 * `'ASEC'`).  The repository applies this as an implicit filter on every
 * read and enforces it on every write.
 */
export interface ContractorScope {
  readonly scopeType: 'CONTRACTOR';
  /** Normalized contractor identifier (upper-case).  Must not be blank. */
  readonly contractorId: string;
}

/** Deny scope — no storage access permitted under any circumstances. */
export interface DenyScope {
  readonly scopeType: 'DENY';
  readonly contractorId?: undefined;
}

/**
 * Discriminated union passed to every storage read and write operation.
 *
 * Switch on `scopeType` to determine the access level:
 *
 * ```typescript
 * switch (scope.scopeType) {
 *   case 'GLOBAL':     // ACC admin — return all data
 *   case 'CONTRACTOR': // single-contractor — filter by scope.contractorId
 *   case 'DENY':       // reject immediately
 * }
 * ```
 */
export type ContractorScopeFilter = GlobalScope | ContractorScope | DenyScope;

// ── Factories ─────────────────────────────────────────────────────────────────

/** Creates a {@link GlobalScope} for ACC platform administrators. */
export function globalScope(): GlobalScope {
  return { scopeType: 'GLOBAL' };
}

/**
 * Creates a {@link ContractorScope} for a single-contractor caller.
 * @throws {Error} if contractorId is blank.
 */
export function contractorScope(contractorId: string): ContractorScope {
  const normalized = contractorId.trim().toUpperCase();
  if (normalized.length === 0) {
    throw new Error('ContractorScopeFilter: contractorId cannot be empty');
  }
  return { scopeType: 'CONTRACTOR', contractorId: normalized };
}

/** Creates a {@link DenyScope} for unauthorized or invalid callers. */
export function denyScope(): DenyScope {
  return { scopeType: 'DENY' };
}

// ── Type guards ───────────────────────────────────────────────────────────────

/** Returns `true` if `scope` grants global (cross-contractor) access. */
export function isGlobalScope(scope: ContractorScopeFilter): scope is GlobalScope {
  return scope.scopeType === 'GLOBAL';
}

/** Returns `true` if `scope` restricts access to a single contractor. */
export function isContractorScope(scope: ContractorScopeFilter): scope is ContractorScope {
  return scope.scopeType === 'CONTRACTOR';
}

/** Returns `true` if `scope` explicitly denies all storage access. */
export function isDenyScope(scope: ContractorScopeFilter): scope is DenyScope {
  return scope.scopeType === 'DENY';
}
