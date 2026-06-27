// platform/services/src/contracts/communication-types.ts
// Shared vocabulary for all platform communication contracts.
//
// Defines:
//  - EquipmentId       — master cross-platform equipment identifier
//  - PlatformModule    — exhaustive list of known platform modules
//  - MessagePriority   — message urgency levels
//  - ContractVersion   — versioning token for forward compatibility
//  - MessageMetadata   — immutable header carried by every event and message
//  - PlatformEvent<T>  — base shape for domain events (something happened)
//  - PlatformMessage<T>— base shape for commands / requests (do something)
//
// These types are transport-independent and storage-independent.
// They must not change when the delivery mechanism changes (e.g. direct call → Event Bus).

import type { UserId, ContractorId } from '../auth/auth-types';
import type { CorrelationId, MessageId, TraceId } from './correlation';

// ── Equipment identifier ──────────────────────────────────────────────────────

/**
 * Master equipment identifier for the entire platform.
 *
 * Per AI_DEVELOPMENT_GUIDE: "Equipment_ID is the master equipment identifier
 * across the entire platform.  Never introduce alternative equipment keys."
 *
 * Use {@link createEquipmentId} to produce values of this type.
 */
export type EquipmentId = string & { readonly __brand: 'EquipmentId' };

/**
 * Creates an {@link EquipmentId} from a raw string.
 * @throws {Error} if value is blank.
 */
export function createEquipmentId(value: string): EquipmentId {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error('EquipmentId cannot be empty');
  return trimmed as EquipmentId;
}

// ── Platform modules ──────────────────────────────────────────────────────────

/**
 * Ordered tuple of all known platform module identifiers.
 *
 * New modules are added here.  Business modules may declare additional
 * module ids using the open-union extension on {@link PlatformModule}.
 */
export const PLATFORM_MODULES = [
  'oil-lubrication',
  'oil-analysis',
  'vibration-analysis',
  'reliability-measurements',
  'compressors',
  'owner-center',
  'contractor-portal',
  'notification-service',
  'action-service',
] as const;

/** Union of all known platform module identifiers. */
export type KnownPlatformModule = typeof PLATFORM_MODULES[number];

/**
 * Platform module identifier.
 *
 * The open-union extension `(string & Record<never, never>)` allows future
 * modules to add their identifier without a platform schema change, while
 * preserving IDE autocomplete for known values.
 */
export type PlatformModule = KnownPlatformModule | (string & Record<never, never>);

// ── Message priority ──────────────────────────────────────────────────────────

/**
 * Urgency level attached to every message and event.
 *
 * Consumers may use priority to schedule processing order.
 * Transport adapters (future Event Bus) may route high/critical messages
 * to priority queues without requiring contract changes.
 *
 * Levels (ascending urgency): low → normal → high → critical
 */
export type MessagePriority = 'low' | 'normal' | 'high' | 'critical';

// ── Contract versioning ───────────────────────────────────────────────────────

/**
 * Semantic version token for a communication contract.
 *
 * Format: `"major.minor"` — e.g. `"1.0"`, `"1.1"`, `"2.0"`.
 *
 * Rules:
 *  - Increment `minor` for backward-compatible additions (new optional fields).
 *  - Increment `major` for breaking changes (field removal, type narrowing).
 *  - Consumers must tolerate unknown `minor` versions within the same `major`.
 */
export type ContractVersion = string;

/** Current platform contract generation — all v1.x contracts are inter-operable. */
export const CONTRACT_VERSION_1_0: ContractVersion = '1.0';

// ── Message metadata ──────────────────────────────────────────────────────────

/**
 * Immutable header attached to every platform event and message.
 *
 * Metadata is transport-independent: whether a contract is delivered by a
 * direct service call, an in-process Event Bus, or a future message queue,
 * this header remains unchanged.
 *
 * All fields required except those explicitly marked optional.
 */
export interface MessageMetadata {
  /** Unique identifier for this specific message or event envelope. */
  readonly messageId: MessageId;

  /**
   * Links all messages and events produced by the same user action.
   * Attach the originating {@link CorrelationId} to every outgoing contract.
   */
  readonly correlationId: CorrelationId;

  /** Optional distributed trace identifier for cross-service observability. */
  readonly traceId?: TraceId;

  /** ISO 8601 timestamp when this message was created (UTC). */
  readonly timestamp: string;

  /** Module that produced this message or event. */
  readonly sourceModule: PlatformModule;

  /**
   * Intended recipient module.
   * Optional on broadcast events; required on targeted messages.
   */
  readonly targetModule?: PlatformModule;

  /** User who triggered the originating operation, if applicable. */
  readonly userId?: UserId;

  /**
   * Contractor scope for this message.
   * Required whenever the contract payload is contractor-scoped data.
   */
  readonly contractorId?: ContractorId;

  /**
   * Master equipment identifier for the subject of this message.
   * Present only when the contract relates to a specific piece of equipment.
   */
  readonly equipmentId?: EquipmentId;

  /** Urgency level — consumers may use this for scheduling and routing. */
  readonly priority: MessagePriority;

  /**
   * Contract schema version.  Consumers must check `major` compatibility
   * before processing.  Use {@link CONTRACT_VERSION_1_0} for current contracts.
   */
  readonly version: ContractVersion;
}

// ── Base envelope types ───────────────────────────────────────────────────────

/**
 * Base shape for a domain event — something that happened.
 *
 * Events are immutable facts.  They are never modified after creation.
 * The generic parameter `TPayload` carries the event-specific data.
 *
 * Naming convention: past tense — e.g. `OilChangeCompleted`, `UserCreated`.
 */
export interface PlatformEvent<TPayload> {
  readonly meta: MessageMetadata;
  readonly payload: Readonly<TPayload>;
}

/**
 * Base shape for a platform message — a command or request to perform an action.
 *
 * Messages represent intent.  They may be fulfilled synchronously or
 * asynchronously.  The generic parameter `TPayload` carries the request data.
 *
 * Naming convention: imperative or past-request — e.g. `OilChangeRequested`,
 * `NotificationRequested`.
 */
export interface PlatformMessage<TPayload> {
  readonly meta: MessageMetadata;
  readonly payload: Readonly<TPayload>;
}
