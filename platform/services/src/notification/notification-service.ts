// platform/services/src/notification/notification-service.ts
// In-memory implementation of INotificationService.
//
// Design constraints:
//   - No persistence, no external I/O, no real delivery.
//   - All records are held in a Map keyed by NotificationId.
//   - Contractor isolation is enforced on every recipient-scoped query.
//   - Records are frozen objects; status transitions produce new frozen objects.
//   - FIFO eviction when maxRecordsInMemory is reached.
//
// Future integration hooks:
//   - send(): replace the no-op delivery path with real email/push adapters.
//   - pruneExpired(): wire into a platform scheduler (future milestone).
//   - Storage Abstraction: persist records via IRepository when available.
//   - Metrics Service: record dispatch durations and failure counts.
//   - Event Bus (Phase 9): publish NotificationDeliveredEvent / NotificationFailedEvent.

import type { UserId, ContractorId } from '../auth/auth-types';
import type { PlatformModule } from '../contracts/communication-types';
import {
  INotificationService,
  NotificationId,
  NotificationRecord,
  NotificationRequest,
  NotificationServiceOptions,
  NotificationStatus,
  NotificationSummary,
  NotificationType,
  generateNotificationId,
} from './notification-types';
import { NotificationError, NotificationNotFoundError, NotificationRecipientError } from '../errors';

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_MAX_RECORDS_IN_MEMORY = 1000;

// ── NotificationService ───────────────────────────────────────────────────────

/**
 * In-memory notification dispatch service.
 *
 * All operations are safe for single-threaded Node.js use.  No background
 * threads, no network calls, no timers.
 *
 * The service id `platform.notifications` is reserved in the Service Registry.
 * Registration into bootstrap is deferred to the SDK milestone.
 */
export class NotificationService implements INotificationService {
  /** Records keyed by NotificationId, in insertion order. */
  private readonly records = new Map<string, NotificationRecord>();
  private readonly maxRecordsInMemory: number;

  constructor(options?: NotificationServiceOptions) {
    this.maxRecordsInMemory =
      options?.maxRecordsInMemory ?? DEFAULT_MAX_RECORDS_IN_MEMORY;
  }

  // ── Dispatch ─────────────────────────────────────────────────────────────────

  async send(request: NotificationRequest): Promise<NotificationRecord> {
    this.validateRecipients(request);
    return this.processRequest(request);
  }

  async sendBatch(
    requests: readonly NotificationRequest[],
  ): Promise<readonly NotificationRecord[]> {
    const results: NotificationRecord[] = [];
    for (const request of requests) {
      try {
        this.validateRecipients(request);
        results.push(this.processRequest(request));
      } catch (err) {
        if (err instanceof NotificationError) {
          const now = new Date().toISOString();
          const id = generateNotificationId();
          const failed = this.makeRecord(id, request, 'failed', now, now, {
            failureReason: err.message,
          });
          this.storeRecord(failed);
          results.push(failed);
        } else {
          throw err;
        }
      }
    }
    return results;
  }

  // ── Query ─────────────────────────────────────────────────────────────────────

  getRecord(id: NotificationId): NotificationRecord | null {
    return this.records.get(id) ?? null;
  }

  getRecordsForRecipient(
    userId: UserId,
    contractorId: ContractorId,
  ): readonly NotificationRecord[] {
    const result: NotificationRecord[] = [];
    for (const record of this.records.values()) {
      const match = record.request.recipients.some(
        (r) => r.userId === userId && r.contractorId === contractorId,
      );
      if (match) result.push(record);
    }
    return result;
  }

  getRecordsByStatus(status: NotificationStatus): readonly NotificationRecord[] {
    const result: NotificationRecord[] = [];
    for (const record of this.records.values()) {
      if (record.status === status) result.push(record);
    }
    return result;
  }

  getRecordsByModule(requestingModule: PlatformModule): readonly NotificationRecord[] {
    const result: NotificationRecord[] = [];
    for (const record of this.records.values()) {
      if (record.request.requestingModule === requestingModule) {
        result.push(record);
      }
    }
    return result;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  dismiss(id: NotificationId, _userId: UserId): NotificationRecord {
    const existing = this.records.get(id);
    if (existing === undefined) {
      throw new NotificationNotFoundError(id);
    }
    const updated = this.makeRecord(
      id,
      existing.request,
      'dismissed',
      existing.createdAt,
      new Date().toISOString(),
      {
        ...(existing.sentAt !== undefined ? { sentAt: existing.sentAt } : {}),
        deliveryAttempts: existing.deliveryAttempts,
      },
    );
    this.records.set(id, updated);
    return updated;
  }

  pruneExpired(): number {
    const now = new Date().toISOString();
    let count = 0;
    for (const [id, record] of this.records.entries()) {
      if (record.status === 'dismissed' || record.status === 'expired') continue;
      const expiresAt = record.request.payload.expiresAt;
      if (expiresAt !== undefined && expiresAt < now) {
        const expired = this.makeRecord(
          id as NotificationId,
          record.request,
          'expired',
          record.createdAt,
          now,
          {
            ...(record.sentAt !== undefined ? { sentAt: record.sentAt } : {}),
            ...(record.failureReason !== undefined
              ? { failureReason: record.failureReason }
              : {}),
            deliveryAttempts: record.deliveryAttempts,
          },
        );
        this.records.set(id, expired);
        count += 1;
      }
    }
    return count;
  }

  // ── Summary ───────────────────────────────────────────────────────────────────

  getSummary(): NotificationSummary {
    const byStatus: Partial<Record<NotificationStatus, number>> = {};
    const byType: Partial<Record<NotificationType, number>> = {};

    for (const record of this.records.values()) {
      byStatus[record.status] = (byStatus[record.status] ?? 0) + 1;
      const type = record.request.payload.type;
      byType[type] = (byType[type] ?? 0) + 1;
    }

    return Object.freeze({
      totalRecords: this.records.size,
      byStatus: Object.freeze(byStatus),
      byType: Object.freeze(byType),
      capturedAt: new Date().toISOString(),
    });
  }

  listIds(): readonly NotificationId[] {
    return Array.from(this.records.keys()) as NotificationId[];
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private validateRecipients(request: NotificationRequest): void {
    if (request.recipients.length === 0) {
      throw new NotificationRecipientError(
        'NotificationRequest must include at least one recipient',
      );
    }
  }

  /**
   * Creates a notification record, simulates immediate in-memory "delivery",
   * and stores it.  No real channel delivery occurs in this implementation.
   */
  private processRequest(request: NotificationRequest): NotificationRecord {
    const id = generateNotificationId();
    const now = new Date().toISOString();

    const record = this.makeRecord(id, request, 'sent', now, now, {
      sentAt: now,
      deliveryAttempts: 1,
    });

    this.storeRecord(record);
    return record;
  }

  /**
   * Constructs a frozen {@link NotificationRecord}.
   * The overrides object carries optional fields whose presence depends on status.
   */
  private makeRecord(
    id: NotificationId,
    request: NotificationRequest,
    status: NotificationStatus,
    createdAt: string,
    updatedAt: string,
    overrides: {
      sentAt?: string;
      failureReason?: string;
      deliveryAttempts?: number;
    } = {},
  ): NotificationRecord {
    return Object.freeze<NotificationRecord>({
      id,
      request,
      status,
      createdAt,
      updatedAt,
      ...(overrides.sentAt !== undefined ? { sentAt: overrides.sentAt } : {}),
      ...(overrides.failureReason !== undefined
        ? { failureReason: overrides.failureReason }
        : {}),
      deliveryAttempts: overrides.deliveryAttempts ?? 0,
    });
  }

  /**
   * Stores a record with FIFO eviction when the capacity limit is reached.
   * The oldest key (first in insertion order) is evicted.
   */
  private storeRecord(record: NotificationRecord): void {
    if (this.records.size >= this.maxRecordsInMemory) {
      const firstKey = this.records.keys().next().value;
      if (firstKey !== undefined) {
        this.records.delete(firstKey);
      }
    }
    this.records.set(record.id, record);
  }
}
