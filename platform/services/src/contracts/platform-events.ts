// platform/services/src/contracts/platform-events.ts
// Domain event contracts for the ACC Reliability Platform.
//
// Events represent immutable facts — things that have happened.
// They are named in the past tense and carry only the data needed by consumers.
//
// Design rules:
//  - Every event has a typed payload interface (XxxPayload).
//  - Every event has a typed envelope interface (XxxEvent) with a discriminant `type` field.
//  - Every event carries a CONTRACT_VERSION constant for forward-compatibility tracking.
//  - No methods.  No classes.  Pure immutable DTOs only.
//  - No transport.  No bus.  No publish/subscribe.  Contracts only.
//
// Event groups:
//  Oil Lubrication ── OilChangeCompleted
//  Oil Analysis    ── OilAnalysisCompleted · OilAnalysisCritical · ResampleRequired
//  Action Service  ── ActionCreated · ActionCompleted
//  Equipment       ── EquipmentStatusChanged
//  Routes          ── RouteAssigned · RouteCompleted
//  Health          ── HealthStatusChanged
//  User/Access     ── UserCreated · UserUpdated · PermissionChanged

import type { UserId, ContractorId } from '../auth/auth-types';
import type { EquipmentId, PlatformModule, PlatformEvent, ContractVersion } from './communication-types';

// ── Oil Lubrication Events ────────────────────────────────────────────────────

/** Version of the {@link OilChangeCompletedEvent} contract. */
export const OIL_CHANGE_COMPLETED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link OilChangeCompletedEvent}. */
export interface OilChangeCompletedPayload {
  /** Equipment on which the oil change was performed. */
  readonly equipmentId: EquipmentId;
  /** Contractor who carried out the work. */
  readonly contractorId: ContractorId;
  /** User who recorded the completion. */
  readonly completedBy: UserId;
  /** ISO 8601 timestamp when the oil change was completed. */
  readonly completedAt: string;
  /** Oil type or grade used (e.g. "ISO VG 46"). */
  readonly oilType: string;
  /** Quantity of oil used, in litres. */
  readonly quantityLitres: number;
  /** Optional reference to the maintenance work order. */
  readonly workOrderId?: string;
  /** Optional notes recorded by the technician. */
  readonly notes?: string;
}

/**
 * Published when an oil change has been successfully completed on a piece of equipment.
 *
 * Source module: `oil-lubrication`
 * Consumers: `oil-analysis` (may trigger a post-change baseline sample), `action-service`
 */
export interface OilChangeCompletedEvent extends PlatformEvent<OilChangeCompletedPayload> {
  readonly type: 'OilChangeCompleted';
}

// ── Oil Analysis Events ───────────────────────────────────────────────────────

/** Version of the {@link OilAnalysisCompletedEvent} contract. */
export const OIL_ANALYSIS_COMPLETED_VERSION: ContractVersion = '1.0';

/** Summary of a single measured parameter from an oil analysis sample. */
export interface OilAnalysisParameter {
  /** Parameter name (e.g. "Viscosity", "Iron (Fe)", "Water %"). */
  readonly parameter: string;
  /** Measured value. */
  readonly value: number;
  /** Unit of measurement (e.g. "cSt", "ppm", "%"). */
  readonly unit: string;
  /** Whether this parameter is within the acceptable limit. */
  readonly withinLimit: boolean;
}

/** Data payload for the {@link OilAnalysisCompletedEvent}. */
export interface OilAnalysisCompletedPayload {
  /** Equipment whose oil was sampled. */
  readonly equipmentId: EquipmentId;
  readonly contractorId: ContractorId;
  /** Unique identifier for this analysis sample. */
  readonly sampleId: string;
  /** ISO 8601 date the sample was taken. */
  readonly sampledAt: string;
  /** ISO 8601 date the laboratory report was finalised. */
  readonly analysedAt: string;
  /** Summary of measured parameters. */
  readonly parameters: readonly OilAnalysisParameter[];
  /** Overall condition verdict: normal, monitor, critical. */
  readonly overallCondition: 'normal' | 'monitor' | 'critical';
  /** Optional laboratory reference number. */
  readonly labReference?: string;
}

/**
 * Published when an oil analysis laboratory report has been received and recorded.
 *
 * Source module: `oil-analysis`
 * Consumers: `action-service`, `notification-service`, `reliability-measurements`
 */
export interface OilAnalysisCompletedEvent extends PlatformEvent<OilAnalysisCompletedPayload> {
  readonly type: 'OilAnalysisCompleted';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link OilAnalysisCriticalEvent} contract. */
export const OIL_ANALYSIS_CRITICAL_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link OilAnalysisCriticalEvent}. */
export interface OilAnalysisCriticalPayload {
  readonly equipmentId: EquipmentId;
  readonly contractorId: ContractorId;
  readonly sampleId: string;
  readonly analysedAt: string;
  /** Parameters that exceeded critical thresholds. */
  readonly criticalParameters: readonly OilAnalysisParameter[];
  /** Severity of the critical finding. */
  readonly severity: 'warning' | 'critical' | 'emergency';
  /** Human-readable description of the critical finding. */
  readonly finding: string;
  /** Recommended immediate action. */
  readonly recommendedAction?: string;
}

/**
 * Published when oil analysis results indicate a critical equipment condition.
 *
 * This event is always raised in addition to {@link OilAnalysisCompletedEvent} when
 * `overallCondition === 'critical'`.  Consumers that only care about critical findings
 * subscribe to this event only.
 *
 * Source module: `oil-analysis`
 * Consumers: `action-service` (mandatory), `notification-service`, `owner-center`
 */
export interface OilAnalysisCriticalEvent extends PlatformEvent<OilAnalysisCriticalPayload> {
  readonly type: 'OilAnalysisCritical';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link ResampleRequiredEvent} contract. */
export const RESAMPLE_REQUIRED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link ResampleRequiredEvent}. */
export interface ResampleRequiredPayload {
  readonly equipmentId: EquipmentId;
  readonly contractorId: ContractorId;
  /** Sample that triggered the re-sample request. */
  readonly originalSampleId: string;
  /** ISO 8601 date by which the re-sample should be taken. */
  readonly requiredBy: string;
  /** Reason the re-sample is needed. */
  readonly reason: string;
  /** How urgent the re-sample is. */
  readonly urgency: 'routine' | 'urgent' | 'immediate';
}

/**
 * Published when a previously collected oil sample must be re-taken.
 *
 * Common reasons: contaminated sample, inconclusive results, equipment status change.
 *
 * Source module: `oil-analysis`
 * Consumers: `contractor-portal`, `notification-service`
 */
export interface ResampleRequiredEvent extends PlatformEvent<ResampleRequiredPayload> {
  readonly type: 'ResampleRequired';
}

// ── Action Service Events ─────────────────────────────────────────────────────

/** Version of the {@link ActionCreatedEvent} contract. */
export const ACTION_CREATED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link ActionCreatedEvent}. */
export interface ActionCreatedPayload {
  /** Platform-unique identifier for this action. */
  readonly actionId: string;
  /** Category of the action (e.g. "OilChange", "Inspection", "Repair"). */
  readonly actionType: string;
  /** Human-readable title. */
  readonly title: string;
  /** Detailed description of what must be done. */
  readonly description: string;
  readonly equipmentId?: EquipmentId;
  readonly contractorId: ContractorId;
  /** User responsible for completing this action. */
  readonly assignedTo: UserId;
  /** User who created the action. */
  readonly createdBy: UserId;
  /** ISO 8601 timestamp when the action was created. */
  readonly createdAt: string;
  /** ISO 8601 date by which the action must be completed. */
  readonly dueDate: string;
  /** Priority inherited from the triggering event. */
  readonly priority: 'low' | 'normal' | 'high' | 'critical';
  /** Module that originated this action (for traceability). */
  readonly originatingModule: PlatformModule;
  /** Reference to the event that triggered this action, if any. */
  readonly triggerEventId?: string;
}

/**
 * Published when a new action has been created and assigned.
 *
 * Source module: `action-service`
 * Consumers: `notification-service`, `contractor-portal`, `owner-center`
 */
export interface ActionCreatedEvent extends PlatformEvent<ActionCreatedPayload> {
  readonly type: 'ActionCreated';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link ActionCompletedEvent} contract. */
export const ACTION_COMPLETED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link ActionCompletedEvent}. */
export interface ActionCompletedPayload {
  readonly actionId: string;
  readonly equipmentId?: EquipmentId;
  readonly contractorId: ContractorId;
  /** User who marked the action as complete. */
  readonly completedBy: UserId;
  /** ISO 8601 timestamp when the action was completed. */
  readonly completedAt: string;
  /** Outcome description recorded by the assignee. */
  readonly outcome: string;
  /** Whether the action was completed within the due date. */
  readonly completedOnTime: boolean;
  /** Optional reference to supporting documentation or evidence. */
  readonly evidenceReference?: string;
}

/**
 * Published when an assigned action has been completed.
 *
 * Source module: `action-service`
 * Consumers: `notification-service`, `reliability-measurements`, `owner-center`
 */
export interface ActionCompletedEvent extends PlatformEvent<ActionCompletedPayload> {
  readonly type: 'ActionCompleted';
}

// ── Equipment Events ──────────────────────────────────────────────────────────

/** Version of the {@link EquipmentStatusChangedEvent} contract. */
export const EQUIPMENT_STATUS_CHANGED_VERSION: ContractVersion = '1.0';

/**
 * Known equipment operational states.
 *
 * The open-union extension allows business modules to define module-specific
 * states without a platform-wide schema change.
 */
export type EquipmentStatus =
  | 'operational'
  | 'degraded'
  | 'under-maintenance'
  | 'out-of-service'
  | 'decommissioned'
  | (string & Record<never, never>);

/** Data payload for the {@link EquipmentStatusChangedEvent}. */
export interface EquipmentStatusChangedPayload {
  readonly equipmentId: EquipmentId;
  readonly contractorId: ContractorId;
  /** Status before this change. */
  readonly previousStatus: EquipmentStatus;
  /** Status after this change. */
  readonly newStatus: EquipmentStatus;
  /** ISO 8601 timestamp when the status changed. */
  readonly changedAt: string;
  /** User who recorded or triggered the change. */
  readonly changedBy: UserId;
  /** Reason for the status change. */
  readonly reason: string;
  /** Module that reported this change. */
  readonly reportingModule: PlatformModule;
}

/**
 * Published whenever a piece of equipment transitions between operational states.
 *
 * Source module: any business module (oil-lubrication, vibration-analysis, etc.)
 * Consumers: `owner-center`, `action-service`, `notification-service`, `reliability-measurements`
 */
export interface EquipmentStatusChangedEvent extends PlatformEvent<EquipmentStatusChangedPayload> {
  readonly type: 'EquipmentStatusChanged';
}

// ── Route Events ──────────────────────────────────────────────────────────────

/** Version of the {@link RouteAssignedEvent} contract. */
export const ROUTE_ASSIGNED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link RouteAssignedEvent}. */
export interface RouteAssignedPayload {
  /** Platform-unique identifier for this inspection/maintenance route. */
  readonly routeId: string;
  /** Human-readable route name. */
  readonly routeName: string;
  readonly contractorId: ContractorId;
  /** User who has been assigned to complete this route. */
  readonly assignedTo: UserId;
  /** User who created the assignment. */
  readonly assignedBy: UserId;
  /** ISO 8601 timestamp when the assignment was made. */
  readonly assignedAt: string;
  /** ISO 8601 date by which the route must be completed. */
  readonly scheduledDate: string;
  /** Equipment items included in this route. */
  readonly equipmentIds: readonly EquipmentId[];
  /** Module managing this route. */
  readonly routeModule: PlatformModule;
}

/**
 * Published when an inspection or maintenance route has been assigned to a technician.
 *
 * Source module: `oil-lubrication` (or future route-management module)
 * Consumers: `contractor-portal`, `notification-service`
 */
export interface RouteAssignedEvent extends PlatformEvent<RouteAssignedPayload> {
  readonly type: 'RouteAssigned';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link RouteCompletedEvent} contract. */
export const ROUTE_COMPLETED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link RouteCompletedEvent}. */
export interface RouteCompletedPayload {
  readonly routeId: string;
  readonly contractorId: ContractorId;
  /** User who completed the route. */
  readonly completedBy: UserId;
  /** ISO 8601 timestamp when the last route item was recorded. */
  readonly completedAt: string;
  /** Total number of equipment items on the route. */
  readonly totalItems: number;
  /** Number of items actually completed. */
  readonly completedItems: number;
  /** Equipment items that were skipped or could not be completed, if any. */
  readonly skippedEquipmentIds?: readonly EquipmentId[];
  /** Optional field notes recorded during the route. */
  readonly notes?: string;
}

/**
 * Published when all items on an assigned route have been processed.
 *
 * Source module: `oil-lubrication` (or future route-management module)
 * Consumers: `owner-center`, `reliability-measurements`, `action-service`
 */
export interface RouteCompletedEvent extends PlatformEvent<RouteCompletedPayload> {
  readonly type: 'RouteCompleted';
}

// ── Health Events ─────────────────────────────────────────────────────────────

/** Version of the {@link HealthStatusChangedEvent} contract. */
export const HEALTH_STATUS_CHANGED_VERSION: ContractVersion = '1.0';

/**
 * Operational health states for platform components and modules.
 * Mirrors the lifecycle health model from the Platform Kernel (Milestone 3.6).
 */
export type ComponentHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/** Data payload for the {@link HealthStatusChangedEvent}. */
export interface HealthStatusChangedPayload {
  /** Identifier of the component whose health changed (module ID or service ID). */
  readonly componentId: string;
  /** Human-readable component name. */
  readonly componentName: string;
  /** Health state before this change. */
  readonly previousStatus: ComponentHealthStatus;
  /** Health state after this change. */
  readonly newStatus: ComponentHealthStatus;
  /** ISO 8601 timestamp when the health transition was detected. */
  readonly detectedAt: string;
  /** Human-readable description of the health condition. */
  readonly reason: string;
  /** Optional structured diagnostic data. */
  readonly diagnostics?: Readonly<Record<string, unknown>>;
}

/**
 * Published when a platform component or business module changes health state.
 *
 * Source module: platform infrastructure (health service, lifecycle manager)
 * Consumers: `owner-center`, `notification-service`, monitoring tooling
 */
export interface HealthStatusChangedEvent extends PlatformEvent<HealthStatusChangedPayload> {
  readonly type: 'HealthStatusChanged';
}

// ── User and Access Events ────────────────────────────────────────────────────

/** Version of the {@link UserCreatedEvent} contract. */
export const USER_CREATED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link UserCreatedEvent}. */
export interface UserCreatedPayload {
  readonly userId: UserId;
  readonly contractorId: ContractorId;
  readonly email: string;
  readonly displayName: string;
  /** Initial roles assigned at account creation. */
  readonly roles: readonly string[];
  /** User who created this account. */
  readonly createdBy: UserId;
  /** ISO 8601 timestamp when the account was created. */
  readonly createdAt: string;
}

/**
 * Published when a new platform user account has been created.
 *
 * Source module: platform identity service
 * Consumers: `notification-service`, `owner-center`, audit service
 */
export interface UserCreatedEvent extends PlatformEvent<UserCreatedPayload> {
  readonly type: 'UserCreated';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link UserUpdatedEvent} contract. */
export const USER_UPDATED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link UserUpdatedEvent}. */
export interface UserUpdatedPayload {
  readonly userId: UserId;
  readonly contractorId: ContractorId;
  /**
   * Names of the fields that changed.
   * Consumers use this to decide whether to act (e.g. only react to email changes).
   */
  readonly changedFields: readonly string[];
  /** User who made the update. */
  readonly updatedBy: UserId;
  /** ISO 8601 timestamp when the update was applied. */
  readonly updatedAt: string;
}

/**
 * Published when a user account profile or settings have been updated.
 *
 * Payload intentionally omits the new field values to prevent PII leakage
 * in the event stream.  Consumers that need the new values query the auth service.
 *
 * Source module: platform identity service
 * Consumers: `owner-center`, audit service
 */
export interface UserUpdatedEvent extends PlatformEvent<UserUpdatedPayload> {
  readonly type: 'UserUpdated';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link PermissionChangedEvent} contract. */
export const PERMISSION_CHANGED_VERSION: ContractVersion = '1.0';

/** Describes a single permission grant or revocation. */
export interface PermissionChange {
  /** Module whose permission changed. */
  readonly moduleId: string;
  /** Action type affected (e.g. "read", "create"). */
  readonly actionType: string;
  /** Whether permission was granted (`true`) or revoked (`false`). */
  readonly granted: boolean;
}

/** Data payload for the {@link PermissionChangedEvent}. */
export interface PermissionChangedPayload {
  readonly userId: UserId;
  readonly contractorId: ContractorId;
  /** The set of permission grants or revocations applied in this change. */
  readonly changes: readonly PermissionChange[];
  /** Reason or administrative note for the change. */
  readonly reason: string;
  /** User who applied the permission change. */
  readonly changedBy: UserId;
  /** ISO 8601 timestamp when the change was applied. */
  readonly changedAt: string;
}

/**
 * Published when a user's permissions have been modified.
 *
 * Consumers that cache permission sets (e.g. the Authorization service) must
 * listen to this event to invalidate stale caches.
 *
 * Source module: platform authorization service
 * Consumers: `owner-center`, audit service, any module that caches permissions
 */
export interface PermissionChangedEvent extends PlatformEvent<PermissionChangedPayload> {
  readonly type: 'PermissionChanged';
}

// ── Discriminated union of all platform events ────────────────────────────────

/**
 * Discriminated union of every platform domain event.
 *
 * Use this type when writing generic event handlers or routing logic.
 * The `type` discriminant uniquely identifies each event shape.
 *
 * @example
 * function handleEvent(event: AnyPlatformEvent): void {
 *   switch (event.type) {
 *     case 'OilChangeCompleted': ...
 *     case 'OilAnalysisCritical': ...
 *   }
 * }
 */
export type AnyPlatformEvent =
  | OilChangeCompletedEvent
  | OilAnalysisCompletedEvent
  | OilAnalysisCriticalEvent
  | ResampleRequiredEvent
  | ActionCreatedEvent
  | ActionCompletedEvent
  | EquipmentStatusChangedEvent
  | RouteAssignedEvent
  | RouteCompletedEvent
  | HealthStatusChangedEvent
  | UserCreatedEvent
  | UserUpdatedEvent
  | PermissionChangedEvent;

/** Extracts the `type` discriminant literal from {@link AnyPlatformEvent}. */
export type PlatformEventType = AnyPlatformEvent['type'];
