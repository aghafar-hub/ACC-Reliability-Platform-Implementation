// platform/services/src/notification/notification-types.ts
// All types and the INotificationService contract for platform-wide notification dispatch.
//
// Responsibilities of this module:
//   - Define every type consumed by INotificationService callers.
//   - Describe six notification types: info, warning, alert, critical, reminder, system.
//   - Describe three delivery channels: inApp, email, mobilePush (open union for future channels).
//   - Describe six notification statuses: pending, queued, sent, failed, dismissed, expired.
//   - Enforce contractor isolation through ContractorId on every recipient.
//   - Support correlation metadata from communication contracts (CorrelationId, PlatformModule).
//
// Non-responsibilities (enforced by design):
//   - No real email delivery, no push gateway, no SMS integration.
//   - No UI, no dashboard, no reports.
//   - No storage implementation — records are held in-memory only.
//   - No business module logic.

import type { UserId, ContractorId } from '../auth/auth-types';
import type { CorrelationId } from '../contracts/correlation';
import type { PlatformModule, MessagePriority } from '../contracts/communication-types';

// ── NotificationId ────────────────────────────────────────────────────────────

declare const NotificationIdBrand: unique symbol;

/**
 * Branded string that uniquely identifies a notification record within the platform.
 * Always produced via {@link createNotificationId}; never cast from a raw string.
 */
export type NotificationId = string & { readonly [NotificationIdBrand]: 'NotificationId' };

/**
 * Creates a {@link NotificationId} from a plain string.
 * Rejects blank or whitespace-only values.
 */
export function createNotificationId(value: string): NotificationId {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error('NotificationId must not be blank');
  }
  return trimmed as NotificationId;
}

/**
 * Generates a new unique {@link NotificationId}.
 * Uses timestamp + random suffix — suitable for in-memory and future storage use.
 * No external dependencies required.
 */
export function generateNotificationId(): NotificationId {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 9);
  return createNotificationId(`ntf-${ts}-${rnd}`);
}

// ── NotificationType ──────────────────────────────────────────────────────────

/**
 * The six supported notification types, ordered by ascending severity.
 *
 * - `info`      — Informational update; no action required.
 * - `warning`   — Condition worth attention; may require action soon.
 * - `alert`     — Action is recommended; a threshold or rule has triggered.
 * - `critical`  — Immediate action required; equipment or process at risk.
 * - `reminder`  — Scheduled prompt for a pending task or deadline.
 * - `system`    — Platform-generated operational message (bootstrap, health, config).
 */
export type NotificationType = 'info' | 'warning' | 'alert' | 'critical' | 'reminder' | 'system';

/** Ordered constant tuple of all built-in notification types. */
export const NOTIFICATION_TYPES: readonly NotificationType[] = [
  'info',
  'warning',
  'alert',
  'critical',
  'reminder',
  'system',
] as const;

// ── NotificationChannel ───────────────────────────────────────────────────────

/**
 * The supported notification delivery channels.
 *
 * - `inApp`      — In-application notification, displayed within the platform UI.
 * - `email`      — Email delivery (no real sending in the current implementation).
 * - `mobilePush` — Mobile push notification via a future push-gateway integration.
 *
 * The open-union extension allows future channels (e.g. `'sms'`, `'webhook'`) to be
 * added by platform integrations without a core type change.
 */
export type NotificationChannel =
  | 'inApp'
  | 'email'
  | 'mobilePush'
  | (string & Record<never, never>);

/** Ordered constant tuple of the built-in notification delivery channels. */
export const NOTIFICATION_CHANNELS: readonly ['inApp', 'email', 'mobilePush'] = [
  'inApp',
  'email',
  'mobilePush',
] as const;

// ── NotificationStatus ────────────────────────────────────────────────────────

/**
 * The six lifecycle statuses for a notification record.
 *
 * Allowed transitions (loosely):
 * ```
 * pending → queued → sent
 *                  → failed
 * pending → failed
 * sent    → dismissed
 * sent    → expired   (via pruneExpired())
 * queued  → expired   (via pruneExpired())
 * pending → expired   (via pruneExpired())
 * ```
 */
export type NotificationStatus =
  | 'pending'
  | 'queued'
  | 'sent'
  | 'failed'
  | 'dismissed'
  | 'expired';

// ── NotificationRecipient ─────────────────────────────────────────────────────

/**
 * A single recipient of a notification, with contractor isolation enforced.
 *
 * The `contractorId` is mandatory to ensure contractor data never leaks across
 * boundaries.  The service must reject requests where `userId` does not belong
 * to the provided `contractorId` (enforcement is a future implementation detail;
 * the type captures the intent now).
 *
 * If `channels` is empty the notification service may select channels based on
 * user preferences in a future implementation.  The current in-memory
 * implementation records all channels as-is.
 */
export interface NotificationRecipient {
  /** Target user. */
  readonly userId: UserId;
  /** Contractor this user belongs to.  Enforces data isolation. */
  readonly contractorId: ContractorId;
  /**
   * Preferred delivery channels for this recipient.
   * If empty, the service uses a platform default (currently `['inApp']`).
   */
  readonly channels: readonly NotificationChannel[];
}

// ── NotificationPayload ───────────────────────────────────────────────────────

/**
 * The content of a notification — what the recipient sees.
 *
 * This is the immutable message body.  It carries no delivery or routing
 * information; those concerns belong to {@link NotificationRequest}.
 */
export interface NotificationPayload {
  /** Classification of this notification. Affects urgency and styling in the UI. */
  readonly type: NotificationType;
  /**
   * Short notification title.
   * Used as the email subject, push title, and in-app heading.
   * Should be concise (under 120 characters).
   */
  readonly subject: string;
  /** Full notification body text.  Markdown is permitted for in-app rendering. */
  readonly body: string;
  /**
   * Machine-readable category for filtering and grouping.
   * Format: `"<module>.<event>"` — e.g. `"oil-analysis.critical"`, `"action.overdue"`.
   */
  readonly category: string;
  /**
   * Optional deep-link URL the recipient can follow from the notification.
   * Must be a relative path within the platform or an absolute URL.
   */
  readonly actionUrl?: string;
  /**
   * ISO 8601 timestamp after which this notification should not be delivered
   * and should be considered {@link NotificationStatus | expired}.
   * Useful for time-sensitive alerts where a stale notification is worse than none.
   */
  readonly expiresAt?: string;
  /** Optional structured data for custom rendering by future UI integrations. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ── NotificationRequest ───────────────────────────────────────────────────────

/**
 * A caller's request to deliver one notification to one or more recipients.
 *
 * The request is immutable once submitted.  The service creates a
 * {@link NotificationRecord} from it and manages delivery lifecycle.
 *
 * Contractor isolation: every {@link NotificationRecipient} carries a
 * `contractorId`.  The service must not fan out a request to recipients
 * from different contractors in a single record — callers must submit
 * separate requests per contractor or mix recipients only when the
 * requesting user holds cross-contractor (`'all'`) scope.
 */
export interface NotificationRequest {
  /**
   * Recipients.  At least one must be provided.
   * The service throws {@link NotificationRecipientError} if empty.
   */
  readonly recipients: readonly NotificationRecipient[];
  /** The content to deliver. */
  readonly payload: NotificationPayload;
  /**
   * Urgency level that may influence channel selection and delivery ordering
   * in future implementations.
   */
  readonly priority: MessagePriority;
  /**
   * Correlation identifier linking this notification to the triggering
   * platform event or user action.  Used for distributed tracing.
   */
  readonly correlationId?: CorrelationId;
  /**
   * User who triggered the action that produced this notification.
   * Recorded for audit purposes; not displayed to recipients.
   */
  readonly requestedBy?: UserId;
  /**
   * Platform module that is requesting delivery.
   * Used for metrics, audit, and future rate-limiting per module.
   */
  readonly requestingModule?: PlatformModule;
}

// ── NotificationRecord ────────────────────────────────────────────────────────

/**
 * The platform's internal record of a notification through its lifecycle.
 *
 * Returned by {@link INotificationService.send} and stored in-memory.
 * The record is frozen after each status transition; callers must re-fetch
 * to observe updated state.
 *
 * All fields are readonly.  The service creates a new frozen object on
 * every status transition rather than mutating the existing record.
 */
export interface NotificationRecord {
  /** Stable unique identifier for this notification record. */
  readonly id: NotificationId;
  /** The original request that produced this record. */
  readonly request: NotificationRequest;
  /** Current lifecycle status. */
  readonly status: NotificationStatus;
  /** ISO 8601 UTC timestamp when this record was first created. */
  readonly createdAt: string;
  /** ISO 8601 UTC timestamp of the last status transition. */
  readonly updatedAt: string;
  /**
   * ISO 8601 UTC timestamp when the notification was successfully sent.
   * Present only when `status === 'sent'`.
   */
  readonly sentAt?: string;
  /**
   * Human-readable reason for delivery failure.
   * Present only when `status === 'failed'`.
   */
  readonly failureReason?: string;
  /**
   * Number of delivery attempts made so far.
   * The in-memory implementation makes exactly one attempt.
   * Future implementations may retry on failure.
   */
  readonly deliveryAttempts: number;
}

// ── NotificationSummary ───────────────────────────────────────────────────────

/**
 * Platform-wide summary of all notification records held in-memory.
 *
 * Contains aggregate counts only — no individual record data.
 * Call {@link INotificationService.getRecord} or the query methods for per-record state.
 */
export interface NotificationSummary {
  /** Total number of notification records currently held in memory. */
  readonly totalRecords: number;
  /** Record count keyed by {@link NotificationStatus}. */
  readonly byStatus: Readonly<Partial<Record<NotificationStatus, number>>>;
  /** Record count keyed by {@link NotificationType}. */
  readonly byType: Readonly<Partial<Record<NotificationType, number>>>;
  /** ISO 8601 UTC timestamp when this summary was computed. */
  readonly capturedAt: string;
}

// ── NotificationServiceOptions ────────────────────────────────────────────────

/** Optional configuration for the {@link INotificationService} implementation. */
export interface NotificationServiceOptions {
  /**
   * Maximum number of {@link NotificationRecord}s retained in memory.
   * When the limit is reached the oldest records are evicted.
   *
   * @default 1000
   */
  readonly maxRecordsInMemory?: number;
}

// ── INotificationService ──────────────────────────────────────────────────────

/**
 * Contract for the platform notification dispatch service.
 *
 * ## Responsibilities
 * - Accept notification requests from platform components and business modules.
 * - Create and track {@link NotificationRecord}s through their lifecycle.
 * - Enforce contractor isolation on every query and dispatch operation.
 * - Provide in-memory summaries for diagnostic consumption.
 *
 * ## Non-responsibilities (by design)
 * - Real email delivery — future integration milestone.
 * - Mobile push gateway — future integration milestone.
 * - Persistence — future milestone.
 * - Dashboard or report generation — never (UI concern).
 * - Business logic — never (module concern).
 *
 * ## Future integration points
 * - Email adapters: replace the no-op email path with a real SMTP or SaaS call.
 * - Push adapters: replace the no-op push path with FCM/APNs or similar.
 * - Storage: persist records to the Storage Abstraction layer.
 * - Metrics Service: record `notification.dispatch.duration` and `notification.failed.count`.
 * - Event Bus (Phase 9): publish `NotificationDeliveredEvent` / `NotificationFailedEvent`.
 */
export interface INotificationService {

  // ── Dispatch ─────────────────────────────────────────────────────────────────

  /**
   * Submits a notification request and returns the resulting record.
   *
   * The in-memory implementation transitions the record immediately to
   * `'sent'` for all channels.  Future implementations will queue for
   * real delivery.
   *
   * @throws {@link NotificationRecipientError} if `request.recipients` is empty.
   * @throws {@link NotificationError} for any other dispatch failure.
   */
  send(request: NotificationRequest): Promise<NotificationRecord>;

  /**
   * Submits multiple notification requests and returns one record per request.
   *
   * Requests are processed independently.  A failure on one does not abort
   * the others.  The returned array preserves input order.
   *
   * @throws {@link NotificationRecipientError} for requests with empty recipients.
   */
  sendBatch(requests: readonly NotificationRequest[]): Promise<readonly NotificationRecord[]>;

  // ── Query ─────────────────────────────────────────────────────────────────────

  /**
   * Returns the {@link NotificationRecord} for the given id.
   * Returns `null` if no record with that id exists — does not throw.
   */
  getRecord(id: NotificationId): NotificationRecord | null;

  /**
   * Returns all records where the recipient list includes a user matching
   * both `userId` AND `contractorId`.
   *
   * Contractor isolation: results are always scoped to the provided
   * `contractorId`; a caller cannot retrieve records for a different contractor.
   *
   * Result order is insertion order (most-recent-last).
   */
  getRecordsForRecipient(
    userId: UserId,
    contractorId: ContractorId,
  ): readonly NotificationRecord[];

  /**
   * Returns all records currently in the given status.
   * Result order is insertion order.
   */
  getRecordsByStatus(status: NotificationStatus): readonly NotificationRecord[];

  /**
   * Returns all records produced by the given requesting module.
   * Useful for module-level diagnostics without crossing contractor boundaries.
   *
   * Result order is insertion order.
   */
  getRecordsByModule(requestingModule: PlatformModule): readonly NotificationRecord[];

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  /**
   * Transitions a notification to `'dismissed'` status.
   *
   * Only the intended recipient (`userId`) may dismiss a notification.
   * The in-memory implementation trusts the caller; future implementations
   * should verify the user is in the recipient list.
   *
   * @throws {@link NotificationNotFoundError} if no record with `id` exists.
   */
  dismiss(id: NotificationId, userId: UserId): NotificationRecord;

  /**
   * Scans all records and transitions any whose `payload.expiresAt` is in the
   * past to `'expired'` status.  Already-dismissed or already-expired records
   * are skipped.
   *
   * Returns the number of records that were transitioned.
   *
   * Designed for periodic invocation by a platform scheduler (future milestone).
   */
  pruneExpired(): number;

  // ── Summary ───────────────────────────────────────────────────────────────────

  /**
   * Returns a frozen platform-wide summary of all in-memory records.
   * Does not trigger any delivery — a pure read of current state.
   */
  getSummary(): NotificationSummary;

  /**
   * Returns the ids of all currently held notification records in insertion order.
   */
  listIds(): readonly NotificationId[];
}
