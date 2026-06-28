// platform/services/src/audit/audit-types.ts
// Write-only audit trail contract for @acc-reliability/services.
//
// The audit service is a write-once, read-by-platform log.  Every action that
// passes through the Gateway, mutates data, changes configuration, or touches
// security boundaries must be recorded here.
//
// Design decisions:
//   - AuditId is branded to prevent accidental mixing with other id types.
//   - IAuditService is synchronous — audit recording is on the hot path and
//     must not add async overhead.  Providers that flush to durable storage do
//     so out of band.
//   - actor.userId is nullable to support unauthenticated requests (e.g. a
//     login attempt that fails before a session is established).
//   - resource.module is typed as PlatformModule so cross-module attribution
//     is unambiguous.
//   - query() returns an empty array when no entries match; it never throws.
//   - No implementation class in this file — the concrete provider is a future
//     milestone once a durable backend is available.

import type { IsoTimestamp } from '@acc-reliability/shared-types';
import type { UserId, ContractorId, SessionId } from '../auth/auth-types';
import type { CorrelationId } from '../contracts/correlation';
import type { PlatformModule } from '../contracts/communication-types';

// ── AuditId ───────────────────────────────────────────────────────────────────

declare const AuditIdBrand: unique symbol;

/**
 * Branded string that uniquely identifies a single audit entry.
 * Always produced via {@link createAuditId} or {@link generateAuditId}.
 */
export type AuditId = string & { readonly [AuditIdBrand]: 'AuditId' };

/**
 * Creates an {@link AuditId} from a plain string.
 * @throws {Error} if value is blank.
 */
export function createAuditId(value: string): AuditId {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error('AuditId must not be blank');
  }
  return trimmed as AuditId;
}

/** Generates a time-ordered {@link AuditId} without requiring external input. */
export function generateAuditId(): AuditId {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 9);
  return createAuditId(`aud-${ts}-${rnd}`);
}

// ── AuditCategory ─────────────────────────────────────────────────────────────

/**
 * Well-known audit categories.  Kept as a const for exhaustive switch support.
 */
export const AUDIT_CATEGORIES = [
  'auth',
  'data',
  'config',
  'security',
  'gateway',
  'module',
  'system',
] as const;

/** One of the known audit categories or a module-specific extension. */
export type KnownAuditCategory = (typeof AUDIT_CATEGORIES)[number];

/**
 * Open union: one of the known categories or any string extension registered by
 * a module.  Use {@link KnownAuditCategory} when exhaustive handling is needed.
 */
export type AuditCategory = KnownAuditCategory | (string & Record<never, never>);

// ── AuditAction ───────────────────────────────────────────────────────────────

/**
 * Well-known audit actions mapped to standard CRUD and security operations.
 */
export const AUDIT_ACTIONS = [
  'login',
  'logout',
  'create',
  'read',
  'update',
  'delete',
  'authorize',
  'deny',
  'configure',
  'export',
  'import',
  'validate',
] as const;

/** One of the known audit actions. */
export type KnownAuditAction = (typeof AUDIT_ACTIONS)[number];

/**
 * Open union: one of the known actions or a module-specific extension string.
 */
export type AuditAction = KnownAuditAction | (string & Record<never, never>);

// ── AuditOutcome ──────────────────────────────────────────────────────────────

/**
 * The three possible outcomes for any auditable operation.
 *
 * - `success` — the operation completed as requested.
 * - `failure` — the operation attempted but encountered an error.
 * - `denied`  — the operation was blocked before execution (auth or permission failure).
 */
export type AuditOutcome = 'success' | 'failure' | 'denied';

// ── AuditActor ────────────────────────────────────────────────────────────────

/**
 * Identifies who performed the audited action.
 *
 * `userId` and `contractorId` are nullable to support unauthenticated
 * operations such as a failed login attempt, where no session exists yet.
 */
export interface AuditActor {
  /** Platform identity of the acting user; null for unauthenticated requests. */
  readonly userId: UserId | null;
  /** Contractor boundary of the acting user; null for unauthenticated requests. */
  readonly contractorId: ContractorId | null;
  /** Active session handle at the time of the action, if one exists. */
  readonly sessionId?: SessionId;
}

// ── AuditResource ─────────────────────────────────────────────────────────────

/**
 * Identifies the platform resource that was acted upon.
 *
 * `entityId` is optional because some operations (e.g. "list all routes") do
 * not target a single entity.
 */
export interface AuditResource {
  /** Platform module that owns or provides the resource. */
  readonly module: PlatformModule;
  /** Logical entity type (e.g. `'OilRoute'`, `'User'`, `'Permission'`). */
  readonly entityType: string;
  /** Specific entity identity when a single record is targeted. */
  readonly entityId?: string;
}

// ── AuditRequest ──────────────────────────────────────────────────────────────

/**
 * Input shape that callers provide when recording an audit entry.
 *
 * The service assigns the {@link AuditId} and `recordedAt` timestamp;
 * callers must not supply them.
 */
export interface AuditRequest {
  /** Broad category that groups related audit actions (e.g. `'auth'`, `'data'`). */
  readonly category: AuditCategory;
  /** Specific operation that was performed or attempted. */
  readonly action: AuditAction;
  /** Whether the operation succeeded, failed, or was blocked. */
  readonly outcome: AuditOutcome;
  /** Identity of the user or system that initiated the operation. */
  readonly actor: AuditActor;
  /** The platform resource that was targeted. */
  readonly resource: AuditResource;
  /** Correlation handle that links this entry to the originating request. */
  readonly correlationId?: CorrelationId;
  /** Human-readable description of what occurred (logged, not surfaced to clients). */
  readonly description?: string;
  /** Arbitrary structured data relevant to this entry (must not contain secrets). */
  readonly metadata?: Record<string, unknown>;
}

// ── AuditEntry ────────────────────────────────────────────────────────────────

/**
 * Immutable record of a single auditable event as stored by the audit service.
 *
 * Every field from {@link AuditRequest} is preserved, with the service-assigned
 * `id` and `recordedAt` timestamp appended.
 */
export interface AuditEntry {
  /** Unique stable identifier assigned by the audit service at record time. */
  readonly id: AuditId;
  readonly category: AuditCategory;
  readonly action: AuditAction;
  readonly outcome: AuditOutcome;
  readonly actor: AuditActor;
  readonly resource: AuditResource;
  readonly correlationId?: CorrelationId;
  readonly description?: string;
  readonly metadata?: Record<string, unknown>;
  /** ISO 8601 UTC timestamp set by the service when the entry was written. */
  readonly recordedAt: IsoTimestamp;
}

// ── AuditQuery ────────────────────────────────────────────────────────────────

/**
 * Filter criteria for querying the audit trail.
 *
 * All fields are optional.  Omitting all fields returns all stored entries
 * (subject to the `limit`).  Multiple fields are combined with AND semantics.
 */
export interface AuditQuery {
  /** Return only entries matching this category. */
  readonly category?: AuditCategory;
  /** Return only entries matching this action. */
  readonly action?: AuditAction;
  /** Return only entries matching this outcome. */
  readonly outcome?: AuditOutcome;
  /** Return only entries for this user. */
  readonly userId?: UserId;
  /** Return only entries within this contractor boundary. */
  readonly contractorId?: ContractorId;
  /** Return only entries for this platform module. */
  readonly module?: PlatformModule;
  /** Return only entries recorded at or after this timestamp. */
  readonly fromTimestamp?: IsoTimestamp;
  /** Return only entries recorded at or before this timestamp. */
  readonly toTimestamp?: IsoTimestamp;
  /** Return only entries linked to this correlation id. */
  readonly correlationId?: CorrelationId;
  /** Maximum number of entries to return (most recent first). */
  readonly limit?: number;
}

// ── IAuditService ─────────────────────────────────────────────────────────────

/**
 * Platform audit service contract.
 *
 * Provides a write-once audit trail for all auditable platform operations.
 * Business modules and the Gateway call {@link record} on every significant
 * operation.  The App Owner control center queries the trail for compliance
 * and troubleshooting.
 *
 * Rules:
 * - Audit entries are append-only; no update or delete operations exist.
 * - `record()` must never throw — failures are absorbed and logged internally.
 * - `query()` returns an empty array when no entries match.
 * - Implementations must remain compatible with SQL migration (all fields
 *   map to a single flat audit table with nullable columns for optional fields).
 *
 * Service id reserved for registration: `platform.audit`
 */
export interface IAuditService {
  /**
   * Records an auditable event.
   *
   * Returns the stored {@link AuditEntry} with the assigned id and timestamp.
   * Implementations must absorb internal storage errors without propagating
   * them to callers — audit recording must never interrupt the main request.
   */
  record(request: AuditRequest): AuditEntry;

  /**
   * Queries the audit trail using the supplied filter criteria.
   *
   * Returns entries ordered by `recordedAt` descending (most recent first).
   * Returns an empty array when no entries match; never throws.
   */
  query(filter: AuditQuery): readonly AuditEntry[];

  /**
   * Returns the entry with the given id, or `null` if not found.
   * Never throws.
   */
  getById(id: AuditId): AuditEntry | null;

  /**
   * Returns the count of entries matching the filter.
   * Omit the filter to count all stored entries.
   * Never throws.
   */
  count(filter?: AuditQuery): number;
}
