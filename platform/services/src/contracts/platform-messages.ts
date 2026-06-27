// platform/services/src/contracts/platform-messages.ts
// Platform message (command/request) contracts for the ACC Reliability Platform.
//
// Messages represent intent — a module asking another module (or service) to
// perform an action.  They differ from events (past-tense facts) in that they
// are imperative: "please do X".
//
// Design rules:
//  - Every message has a typed payload interface (XxxPayload).
//  - Every message has a typed envelope interface (XxxMessage) with a discriminant `type` field.
//  - Every message carries a CONTRACT_VERSION constant.
//  - No methods.  No classes.  Pure immutable DTOs only.
//  - No transport.  No bus.  No send/receive.  Contracts only.
//
// Message list:
//  OilChangeRequested     — request to schedule an oil change
//  NotificationRequested  — request to deliver a notification to a user

import type { UserId, ContractorId } from '../auth/auth-types';
import type { EquipmentId, PlatformModule, PlatformMessage, ContractVersion, MessagePriority } from './communication-types';

// ── Oil Lubrication Messages ──────────────────────────────────────────────────

/** Version of the {@link OilChangeRequestedMessage} contract. */
export const OIL_CHANGE_REQUESTED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link OilChangeRequestedMessage}. */
export interface OilChangeRequestedPayload {
  /** Equipment that requires an oil change. */
  readonly equipmentId: EquipmentId;
  readonly contractorId: ContractorId;
  /** User requesting the oil change. */
  readonly requestedBy: UserId;
  /** ISO 8601 timestamp when the request was raised. */
  readonly requestedAt: string;
  /** ISO 8601 date by which the oil change should be completed. */
  readonly requiredBy: string;
  /**
   * Reason for the request.
   * Common values: "scheduled", "analysis-triggered", "manual", "overdue".
   */
  readonly reason: string;
  /** Oil type or grade to be used (e.g. "ISO VG 46"). */
  readonly oilType?: string;
  /** Optional reference to a prior oil analysis sample that triggered this request. */
  readonly triggeringSampleId?: string;
  /** Optional work order reference from the maintenance management system. */
  readonly workOrderId?: string;
  /** Additional instructions for the technician. */
  readonly instructions?: string;
}

/**
 * Sent when a module or user requests that an oil change be scheduled on equipment.
 *
 * The `oil-lubrication` module is the intended consumer of this message.
 * The module is responsible for creating the corresponding work assignment.
 *
 * Source module: any business module or `owner-center`
 * Target module: `oil-lubrication`
 */
export interface OilChangeRequestedMessage extends PlatformMessage<OilChangeRequestedPayload> {
  readonly type: 'OilChangeRequested';
}

// ── Notification Service Messages ─────────────────────────────────────────────

/** Version of the {@link NotificationRequestedMessage} contract. */
export const NOTIFICATION_REQUESTED_VERSION: ContractVersion = '1.0';

/**
 * Supported notification delivery channels.
 *
 * The open-union extension allows future channels to be added without
 * a platform schema change.
 */
export type NotificationChannel =
  | 'in-app'
  | 'email'
  | 'sms'
  | 'push'
  | (string & Record<never, never>);

/** A single recipient of a notification. */
export interface NotificationRecipient {
  /** Target user. */
  readonly userId: UserId;
  /**
   * Delivery channels to use for this recipient.
   * If empty, the notification service selects channels based on user preferences.
   */
  readonly channels: readonly NotificationChannel[];
}

/** Data payload for the {@link NotificationRequestedMessage}. */
export interface NotificationRequestedPayload {
  /** Module that wants the notification delivered. */
  readonly requestingModule: PlatformModule;
  /** User who triggered the action that produced this notification, if applicable. */
  readonly triggeredBy?: UserId;
  /** Target recipients.  At least one recipient must be provided. */
  readonly recipients: readonly NotificationRecipient[];
  /** Short notification title (used as email subject, push title, in-app heading). */
  readonly subject: string;
  /** Full notification body text. */
  readonly body: string;
  /** Urgency of the notification — may influence channel selection and ordering. */
  readonly priority: MessagePriority;
  /**
   * Machine-readable category for filtering and grouping in the UI.
   * Examples: "oil-analysis.critical", "action.overdue", "equipment.out-of-service".
   */
  readonly category: string;
  /** Optional deep-link URL the user can follow from the notification. */
  readonly actionUrl?: string;
  /**
   * ISO 8601 timestamp after which this notification should not be delivered.
   * Useful for time-sensitive alerts where a stale notification is worse than none.
   */
  readonly expiresAt?: string;
  /** Optional structured data that recipients can use for custom rendering. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Sent by any module when it needs a notification delivered to one or more users.
 *
 * The `notification-service` is the sole consumer of this message.
 * Business modules must never deliver notifications directly — they must
 * always go through this contract.
 *
 * Source module: any business module
 * Target module: `notification-service`
 */
export interface NotificationRequestedMessage extends PlatformMessage<NotificationRequestedPayload> {
  readonly type: 'NotificationRequested';
}

// ── Discriminated union of all platform messages ──────────────────────────────

/**
 * Discriminated union of every platform command/request message.
 *
 * Use this type when writing generic message handlers or routing logic.
 * The `type` discriminant uniquely identifies each message shape.
 *
 * @example
 * function handleMessage(message: AnyPlatformMessage): void {
 *   switch (message.type) {
 *     case 'OilChangeRequested': ...
 *     case 'NotificationRequested': ...
 *   }
 * }
 */
export type AnyPlatformMessage =
  | OilChangeRequestedMessage
  | NotificationRequestedMessage;

/** Extracts the `type` discriminant literal from {@link AnyPlatformMessage}. */
export type PlatformMessageType = AnyPlatformMessage['type'];
