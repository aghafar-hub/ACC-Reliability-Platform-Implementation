// platform/services/src/audit/audit-service.ts
// In-memory implementation of IAuditService for @acc-reliability/services.
//
// Responsibilities:
//   - Append-only in-memory audit log — entries are frozen at write time and
//     never mutated or deleted.
//   - AND-filtered queries with descending-timestamp ordering and offset/limit
//     pagination.
//   - Soft validation: high-risk entries with a missing reason are still written
//     but carry a `_validationWarning` metadata key.
//   - record() absorbs all internal errors; it never propagates exceptions to
//     the caller.
//
// Non-responsibilities:
//   - Durable persistence (SQL migration hook reserved for platform.audit.v2).
//   - PDF/Excel export generation (future milestone).
//   - Authentication — not yet implemented.
//
// Service id: platform.audit

import type { IsoTimestamp } from '@acc-reliability/shared-types';
import type { CorrelationId } from '../contracts/correlation';
import {
  generateAuditId,
  HIGH_RISK_SEVERITIES,
} from './audit-types';
import type {
  AuditId,
  AuditEntry,
  AuditRequest,
  AuditQuery,
  AuditTimeline,
  AuditServiceOptions,
  IAuditService,
} from './audit-types';
import { AuditValidationError } from '../errors';

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_MAX_ENTRIES_IN_MEMORY = 10_000;
const DEFAULT_QUERY_LIMIT = 100;

/**
 * Pre-built set for O(1) severity look-ups.  Using a `Set<string>` avoids the
 * strict-array-inclusion type error that arises with
 * `HIGH_RISK_SEVERITIES.includes(severity)` under `noUncheckedIndexedAccess`.
 */
const HIGH_RISK_SEVERITY_SET: ReadonlySet<string> = new Set<string>(HIGH_RISK_SEVERITIES);

// ── AuditService ──────────────────────────────────────────────────────────────

/**
 * In-memory implementation of the platform audit service.
 *
 * Entries are written once, frozen with `Object.freeze`, and stored in a
 * `Map` keyed by {@link AuditId}.  The map preserves insertion order, which
 * is used for FIFO eviction and chronological iteration.
 *
 * Construction options:
 * ```ts
 * const audit = new AuditService({ maxEntriesInMemory: 5_000 });
 * ```
 *
 * Pre-validation (optional, can throw {@link AuditValidationError}):
 * ```ts
 * AuditService.validateRequest(request); // throws if invalid
 * audit.record(request);                 // never throws
 * ```
 */
export class AuditService implements IAuditService {
  private readonly store = new Map<string, AuditEntry>();
  private readonly maxEntriesInMemory: number;

  constructor(options?: AuditServiceOptions) {
    this.maxEntriesInMemory =
      options?.maxEntriesInMemory ?? DEFAULT_MAX_ENTRIES_IN_MEMORY;
  }

  // ── record ─────────────────────────────────────────────────────────────────

  /**
   * Writes an immutable audit entry and returns it.
   *
   * Guarantees:
   * - Never throws — all internal errors are absorbed.
   * - Returns a frozen {@link AuditEntry} with the service-assigned `id` and
   *   `recordedAt` timestamp.
   * - Appends a `_validationWarning` to `metadata` when a high-risk severity
   *   entry is missing a `reason`, but still records the entry.
   * - Evicts the oldest entry (FIFO) when `maxEntriesInMemory` is reached.
   */
  record(request: AuditRequest): AuditEntry {
    try {
      const validationWarning = this.captureValidationWarning(request);

      const id = generateAuditId();
      const recordedAt = new Date().toISOString() as IsoTimestamp;
      const entry = this.buildEntry(id, recordedAt, request, validationWarning);

      if (this.store.size >= this.maxEntriesInMemory) {
        const firstKey = this.store.keys().next().value;
        if (firstKey !== undefined) {
          this.store.delete(firstKey);
        }
      }

      this.store.set(id, entry);
      return entry;
    } catch {
      // Last-resort fallback — always return a record so the caller can log the id
      const id = generateAuditId();
      const recordedAt = new Date().toISOString() as IsoTimestamp;
      const fallback = Object.freeze<AuditEntry>({
        id,
        category: request.category,
        action: request.action,
        outcome: 'failure' as const,
        actor: request.actor,
        resource: request.resource,
        recordedAt,
        ...(request.correlationId !== undefined
          ? { correlationId: request.correlationId }
          : {}),
        metadata: { _auditServiceError: 'internal error during record()' },
      });
      try {
        this.store.set(id, fallback);
      } catch {
        // ignore — cannot store, still return the fallback entry
      }
      return fallback;
    }
  }

  // ── query ──────────────────────────────────────────────────────────────────

  /**
   * Returns entries matching all supplied filter criteria, ordered by
   * `recordedAt` descending.  Returns an empty array when nothing matches.
   * Never throws.
   */
  query(filter: AuditQuery): readonly AuditEntry[] {
    try {
      const offset = filter.offset ?? 0;
      const limit = filter.limit ?? DEFAULT_QUERY_LIMIT;

      const matched: AuditEntry[] = [];
      for (const entry of this.store.values()) {
        if (this.matchesFilter(entry, filter)) {
          matched.push(entry);
        }
      }

      matched.sort(byRecordedAtDescending);

      return matched.slice(offset, offset + limit);
    } catch {
      return [];
    }
  }

  // ── getById ────────────────────────────────────────────────────────────────

  /** Returns the entry with the given id, or `null` if not found. Never throws. */
  getById(id: AuditId): AuditEntry | null {
    try {
      return this.store.get(id) ?? null;
    } catch {
      return null;
    }
  }

  // ── count ──────────────────────────────────────────────────────────────────

  /**
   * Returns the count of entries matching the filter.
   * Omit the filter to count all stored entries.
   * Never throws.
   */
  count(filter?: AuditQuery): number {
    try {
      if (filter === undefined) {
        return this.store.size;
      }
      let n = 0;
      for (const entry of this.store.values()) {
        if (this.matchesFilter(entry, filter)) {
          n++;
        }
      }
      return n;
    } catch {
      return 0;
    }
  }

  // ── getByCorrelationId ─────────────────────────────────────────────────────

  /**
   * Returns all entries linked to the given correlation id, ordered by
   * `recordedAt` descending.  Never throws.
   */
  getByCorrelationId(correlationId: CorrelationId): readonly AuditEntry[] {
    return this.query({ correlationId, limit: DEFAULT_QUERY_LIMIT });
  }

  // ── getTimeline ────────────────────────────────────────────────────────────

  /**
   * Returns a {@link AuditTimeline} for the given entity — all audit entries
   * targeting that `entityType` / `entityId` pair.
   *
   * `total` always reflects the full un-paginated count so callers can build
   * pagination controls without a second `count()` call.
   * Never throws.
   */
  getTimeline(entityType: string, entityId: string, limit?: number): AuditTimeline {
    try {
      const entries = this.query({
        entityType,
        entityId,
        limit: limit ?? DEFAULT_QUERY_LIMIT,
      });
      const total = this.count({ entityType, entityId });
      return Object.freeze<AuditTimeline>({ entityType, entityId, entries, total });
    } catch {
      return Object.freeze<AuditTimeline>({ entityType, entityId, entries: [], total: 0 });
    }
  }

  // ── Static pre-validation ──────────────────────────────────────────────────

  /**
   * Validates an {@link AuditRequest} against mandatory audit constraints and
   * throws {@link AuditValidationError} on the first violation found.
   *
   * Callers may invoke this before calling {@link record} when they want
   * validation errors surfaced explicitly rather than absorbed silently.
   *
   * Current rules:
   * - `reason` must be a non-empty string when `severity` is `'high'` or
   *   `'critical'`.
   */
  static validateRequest(request: AuditRequest): void {
    if (
      request.severity !== undefined &&
      HIGH_RISK_SEVERITY_SET.has(request.severity) &&
      (request.reason === undefined || request.reason.trim().length === 0)
    ) {
      throw new AuditValidationError(
        `reason is required for severity '${request.severity}'`,
        { severity: request.severity },
      );
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Runs internal validation and returns the warning message if the request
   * violates a soft constraint, or `undefined` when the request is valid.
   * Never throws.
   */
  private captureValidationWarning(request: AuditRequest): string | undefined {
    try {
      AuditService.validateRequest(request);
      return undefined;
    } catch (err) {
      return err instanceof AuditValidationError ? err.message : 'unknown validation error';
    }
  }

  /**
   * Constructs and freezes an {@link AuditEntry} from the request plus
   * service-assigned fields.  Optional fields are omitted when absent to
   * satisfy `exactOptionalPropertyTypes`.
   */
  private buildEntry(
    id: AuditId,
    recordedAt: IsoTimestamp,
    request: AuditRequest,
    validationWarning: string | undefined,
  ): AuditEntry {
    const mergedMetadata: Record<string, unknown> | undefined =
      request.metadata !== undefined || validationWarning !== undefined
        ? {
            ...(request.metadata ?? {}),
            ...(validationWarning !== undefined
              ? { _validationWarning: validationWarning }
              : {}),
          }
        : undefined;

    const entry: AuditEntry = {
      id,
      category: request.category,
      action: request.action,
      outcome: request.outcome,
      actor: request.actor,
      resource: request.resource,
      recordedAt,
      ...(request.correlationId !== undefined
        ? { correlationId: request.correlationId }
        : {}),
      ...(request.description !== undefined
        ? { description: request.description }
        : {}),
      ...(request.severity !== undefined
        ? { severity: request.severity }
        : {}),
      ...(request.reason !== undefined
        ? { reason: request.reason }
        : {}),
      ...(request.clientType !== undefined
        ? { clientType: request.clientType }
        : {}),
      ...(request.ipAddress !== undefined
        ? { ipAddress: request.ipAddress }
        : {}),
      ...(request.beforeValue !== undefined
        ? { beforeValue: request.beforeValue }
        : {}),
      ...(request.afterValue !== undefined
        ? { afterValue: request.afterValue }
        : {}),
      ...(mergedMetadata !== undefined
        ? { metadata: mergedMetadata }
        : {}),
    };

    return Object.freeze(entry);
  }

  /**
   * Returns `true` when `entry` satisfies every criterion supplied in
   * `filter`.  All criteria are ANDed; omitting a criterion is a wildcard.
   */
  private matchesFilter(entry: AuditEntry, filter: AuditQuery): boolean {
    if (filter.category !== undefined && entry.category !== filter.category) {
      return false;
    }
    if (filter.action !== undefined && entry.action !== filter.action) {
      return false;
    }
    if (filter.outcome !== undefined && entry.outcome !== filter.outcome) {
      return false;
    }
    if (filter.userId !== undefined && entry.actor.userId !== filter.userId) {
      return false;
    }
    if (
      filter.contractorId !== undefined &&
      entry.actor.contractorId !== filter.contractorId
    ) {
      return false;
    }
    if (filter.module !== undefined && entry.resource.module !== filter.module) {
      return false;
    }
    if (
      filter.entityType !== undefined &&
      entry.resource.entityType !== filter.entityType
    ) {
      return false;
    }
    if (
      filter.entityId !== undefined &&
      entry.resource.entityId !== filter.entityId
    ) {
      return false;
    }
    if (filter.severity !== undefined && entry.severity !== filter.severity) {
      return false;
    }
    if (
      filter.correlationId !== undefined &&
      entry.correlationId !== filter.correlationId
    ) {
      return false;
    }
    if (
      filter.fromTimestamp !== undefined &&
      entry.recordedAt < filter.fromTimestamp
    ) {
      return false;
    }
    if (
      filter.toTimestamp !== undefined &&
      entry.recordedAt > filter.toTimestamp
    ) {
      return false;
    }
    return true;
  }
}

// ── Sorting helper ────────────────────────────────────────────────────────────

function byRecordedAtDescending(a: AuditEntry, b: AuditEntry): number {
  if (a.recordedAt > b.recordedAt) return -1;
  if (a.recordedAt < b.recordedAt) return 1;
  return 0;
}
