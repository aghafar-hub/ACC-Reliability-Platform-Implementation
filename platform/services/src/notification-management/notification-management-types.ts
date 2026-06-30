// platform/services/src/notification-management/notification-management-types.ts
// Notification Management domain entity, DTOs, repository and service contracts.
//
// Design:
//   - NotificationRuleRecord is the platform's authoritative configuration entity.
//     It represents notification rules, templates, delivery channels, reminder
//     rules, and escalation rules — configuration only, no delivery logic.
//
//   - NotificationRuleStatus lifecycle:
//       enabled  → disable  → disabled
//       disabled → enable   → enabled
//       enabled | disabled → archive → archived
//       archived → restore  → enabled
//
//   - ActorRef is the same lightweight principal reference used by other domains.
//
// Service id reserved: platform.notification-management

import type { UserId } from '../auth/auth-types';
import type { ActorRef } from '../user/user-types';

export type { ActorRef };

// ── NotificationObjectType ────────────────────────────────────────────────────

/** Ordered tuple of all managed notification configuration object types. */
export const NOTIFICATION_OBJECT_TYPES = [
  'rule',
  'template',
  'channel',
  'reminder',
  'escalation',
] as const;

/** Category of notification configuration managed by this domain. */
export type NotificationObjectType = typeof NOTIFICATION_OBJECT_TYPES[number];

// ── NotificationRuleStatus ────────────────────────────────────────────────────

/** Ordered tuple of all valid notification rule lifecycle states. */
export const NOTIFICATION_RULE_STATUSES = ['enabled', 'disabled', 'archived'] as const;

/** Lifecycle state of a notification configuration record. */
export type NotificationRuleStatus = typeof NOTIFICATION_RULE_STATUSES[number];

// ── NotificationRuleId ────────────────────────────────────────────────────────

declare const NotificationRuleIdBrand: unique symbol;

/**
 * Branded string that uniquely identifies a NotificationRuleRecord.
 * Use {@link generateNotificationRuleId} to produce values.
 */
export type NotificationRuleId = string & { readonly [NotificationRuleIdBrand]: 'NotificationRuleId' };

/** Generates a platform-unique {@link NotificationRuleId}. */
export function generateNotificationRuleId(): NotificationRuleId {
  const ts  = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 11);
  return `nfr-${ts}-${rnd}` as NotificationRuleId;
}

/** Creates a {@link NotificationRuleId} from a plain string. @throws {Error} if blank. */
export function createNotificationRuleId(value: string): NotificationRuleId {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error('NotificationRuleId cannot be empty');
  return trimmed as NotificationRuleId;
}

// ── NotificationRuleSettings ────────────────────────────────────────────────────

/**
 * Type-specific configuration payload (structure only — no delivery implementation).
 * Fields are optional; relevance depends on {@link NotificationObjectType}.
 */
export interface NotificationRuleSettings {
  /** Event or condition that triggers the rule (objectType: rule). */
  readonly triggerEvent?: string;
  /** Template key referenced by a rule or reminder. */
  readonly templateKey?: string;
  /** Delivery channel type (objectType: channel). */
  readonly channelType?: 'in-app' | 'email' | 'push';
  /** Bilingual or single-locale message body (objectType: template). */
  readonly messageTemplate?: string;
  /** Hours between reminder sends (objectType: reminder). */
  readonly reminderIntervalHours?: number;
  /** Escalation tier level (objectType: escalation). */
  readonly escalationLevel?: number;
  /** Role keys that receive escalated notifications. */
  readonly escalateToRoles?: readonly string[];
  /** Rule key this reminder or escalation is linked to. */
  readonly linkedRuleKey?: string;
  /** Channel keys enabled for a rule. */
  readonly channelKeys?: readonly string[];
  /** Recipient role keys for a rule. */
  readonly recipientRoles?: readonly string[];
}

// ── NotificationRuleRecord ──────────────────────────────────────────────────────

/**
 * Authoritative notification configuration entity.
 *
 * Invariants:
 *  - id is unique across the entire platform.
 *  - ruleKey is unique within objectType.
 *  - All fields are readonly — mutations produce new records.
 *  - Archived records cannot be enabled or disabled until restored.
 */
export interface NotificationRuleRecord {
  readonly id: NotificationRuleId;
  /** Category of configuration (rule, template, channel, reminder, escalation). */
  readonly objectType: NotificationObjectType;
  /** Unique business key within the object type. */
  readonly ruleKey: string;
  readonly name: string;
  readonly description?: string;
  readonly status: NotificationRuleStatus;
  readonly settings: NotificationRuleSettings;
  readonly createdAt: string;
  readonly createdBy: UserId;
  readonly updatedAt: string;
  readonly updatedBy: UserId;
  readonly enabledAt?: string;
  readonly enabledBy?: UserId;
  readonly disabledAt?: string;
  readonly disabledBy?: UserId;
  readonly disabledReason?: string;
  readonly archivedAt?: string;
  readonly archivedBy?: UserId;
  readonly archivedReason?: string;
  readonly restoredAt?: string;
  readonly restoredBy?: UserId;
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

/** Fields required to create a new notification configuration record. */
export interface CreateNotificationRuleRequest {
  readonly id?: NotificationRuleId;
  readonly objectType: NotificationObjectType;
  readonly ruleKey: string;
  readonly name: string;
  readonly description?: string;
  readonly settings?: NotificationRuleSettings;
  readonly reason?: string;
}

/** Profile fields that may be updated on an existing record. */
export interface UpdateNotificationRuleRequest {
  readonly name?: string;
  readonly description?: string;
  readonly settings?: NotificationRuleSettings;
  readonly reason?: string;
}

/** Filter criteria for listing notification configuration records. */
export interface NotificationRuleListQuery {
  readonly objectType?: NotificationObjectType;
  readonly status?: NotificationRuleStatus;
  readonly searchText?: string;
  readonly offset?: number;
  readonly limit?: number;
}

/** Paginated result from a list operation. */
export interface NotificationRuleListResult {
  readonly rules: readonly NotificationRuleRecord[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
}

/** Aggregate counts for the Owner Center summary cards. */
export interface NotificationManagementSummary {
  readonly activeRules: number;
  readonly templates: number;
  readonly channels: number;
  readonly escalations: number;
  readonly capturedAt: string;
}

// ── INotificationManagementRepository ───────────────────────────────────────────

/**
 * Notification Management repository contract — raw data access layer.
 *
 * Service id reserved: `platform.notification-management.repository`
 */
export interface INotificationManagementRepository {
  save(rule: NotificationRuleRecord): NotificationRuleRecord;
  update(rule: NotificationRuleRecord): NotificationRuleRecord;
  findById(id: NotificationRuleId): NotificationRuleRecord | null;
  findByKey(objectType: NotificationObjectType, ruleKey: string): NotificationRuleRecord | null;
  list(query?: NotificationRuleListQuery): NotificationRuleListResult;
  count(): number;
  remove(id: NotificationRuleId): boolean;
}

// ── INotificationManagementService ──────────────────────────────────────────────

/**
 * Notification Management Service contract.
 *
 * Owns configuration lifecycle for notification rules, templates, channels,
 * reminders, and escalations.  Does not send notifications — that remains
 * the responsibility of INotificationService.
 *
 * Service id reserved: `platform.notification-management`
 */
export interface INotificationManagementService {
  create(request: CreateNotificationRuleRequest, actor: ActorRef): NotificationRuleRecord;
  findById(id: NotificationRuleId): NotificationRuleRecord | null;
  findByKey(objectType: NotificationObjectType, ruleKey: string): NotificationRuleRecord | null;
  list(query?: NotificationRuleListQuery): NotificationRuleListResult;
  update(id: NotificationRuleId, request: UpdateNotificationRuleRequest, actor: ActorRef): NotificationRuleRecord;
  enable(id: NotificationRuleId, actor: ActorRef): NotificationRuleRecord;
  disable(id: NotificationRuleId, reason: string, actor: ActorRef): NotificationRuleRecord;
  archive(id: NotificationRuleId, reason: string, actor: ActorRef): NotificationRuleRecord;
  restore(id: NotificationRuleId, actor: ActorRef): NotificationRuleRecord;
  getSummary(): NotificationManagementSummary;
}
