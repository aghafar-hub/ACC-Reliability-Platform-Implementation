// platform/sdk/src/clients/audit-client.ts
// SDK audit client interface and supporting types.
//
// Business modules write audit records through this client only (PS-114 §13).
// Modules must never write directly to audit storage.
//
// The App Owner control center reads audit records through the query methods
// on this client.  Read operations never create new audit entries.
//
// Audit data model per PS-110 §6.

import type {
  AuditEntry,
  AuditQuery,
  AuditTimeline,
} from '@acc-reliability/services';

// ── Audit event category ──────────────────────────────────────────────────────

/**
 * High-level category classifying the audit event.
 *
 *  - `'auth'`     — login, logout, failed login, session events.
 *  - `'admin'`    — user created/disabled, role changes, contractor changes.
 *  - `'platform'` — module install/update/disable, maintenance mode, kill switch.
 *  - `'business'` — domain operations (action created, sample approved, etc.).
 *  - `'security'` — unauthorized access, permission denied, invalid session.
 */
export type AuditEventCategory =
  | 'auth'
  | 'admin'
  | 'platform'
  | 'business'
  | 'security';

// ── Audit result ──────────────────────────────────────────────────────────────

/**
 * Outcome of the audited operation.
 *
 *  - `'success'` — operation completed as intended.
 *  - `'failure'` — operation was attempted but failed (system error).
 *  - `'denied'`  — operation was blocked by authorization (permission denied).
 */
export type AuditResult = 'success' | 'failure' | 'denied';

// ── Audit request ─────────────────────────────────────────────────────────────

/**
 * Data supplied by the caller when writing an audit record.
 *
 * The platform supplements this with server-side fields (Audit_ID, timestamp,
 * user context from session) before persisting.  Callers must not supply
 * those platform-managed fields.
 *
 * Field semantics follow PS-110 §6.
 */
export interface AuditRequest {
  /** High-level event category. */
  readonly eventCategory: AuditEventCategory;
  /** Stable event name identifier (e.g. `'oil_sample.approved'`). */
  readonly eventType: string;
  /** Logical name of the entity being acted upon (e.g. `'OilSample'`). */
  readonly entityType: string;
  /** Identifier of the specific entity instance, if applicable. */
  readonly entityId?: string | undefined;
  /** Human-readable summary written by the caller. */
  readonly remarks?: string | undefined;
  /** Serialized snapshot of the entity state before the operation. */
  readonly previousValue?: string | undefined;
  /** Serialized snapshot of the entity state after the operation. */
  readonly newValue?: string | undefined;
  /** Outcome of the audited operation. */
  readonly result: AuditResult;
  /**
   * Correlation ID linking this record to a broader business process.
   * When omitted, the SDK uses the correlation id from {@link SdkContext}
   * if one is present.
   */
  readonly correlationId?: string | undefined;
  /** Parent audit record id for hierarchical event chains (PS-110 §6.3). */
  readonly parentAuditId?: string | undefined;
}

// ── IAuditClient ──────────────────────────────────────────────────────────────

/**
 * SDK audit log client.
 *
 * Business modules call {@link write} after every significant operation.
 * The platform owns storage, search, and retention of audit records.
 * Modules must never implement independent audit logging systems (PS-110 §1).
 */
export interface IAuditClient {
  /**
   * Writes a single audit record to the platform Audit Log Service.
   *
   * The call is fire-and-forget from the module's perspective: `write` resolves
   * once the record has been accepted by the service.  Delivery guarantees are
   * determined by the platform implementation.
   *
   * @param entry Caller-supplied audit data.  Platform-managed fields
   *   (Audit_ID, Timestamp, User_ID, Session_ID) are added automatically.
   */
  write(entry: AuditRequest): Promise<void>;

  /**
   * Queries the audit trail using the supplied filter criteria.
   *
   * Returns entries ordered by `recordedAt` descending (most recent first).
   * Read-only — never creates audit records.
   */
  query(filter: AuditQuery): readonly AuditEntry[];

  /**
   * Returns the count of entries matching the filter.
   * Omit the filter to count all stored entries.
   * Read-only — never creates audit records.
   */
  count(filter?: AuditQuery): number;

  /**
   * Returns a chronological view of all audit entries for a single entity.
   * Read-only — never creates audit records.
   */
  getTimeline(entityType: string, entityId: string, limit?: number): AuditTimeline;
}
