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

// ── Master Data Events ────────────────────────────────────────────────────────

/** Version of the {@link EquipmentUpdatedEvent} contract. */
export const EQUIPMENT_UPDATED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link EquipmentUpdatedEvent}. */
export interface EquipmentUpdatedPayload {
  readonly equipmentId: EquipmentId;
  readonly name: string;
  readonly area: string;
  readonly contractorId: ContractorId;
  readonly status: 'active' | 'inactive';
  readonly changedFields: readonly string[];
  readonly updatedBy: UserId;
  readonly updatedAt: string;
}

/**
 * Published when platform equipment master data is created or updated.
 *
 * Source: `platform.equipment`
 * Consumers: oil-lubrication, oil-analysis, future modules
 */
export interface EquipmentUpdatedEvent extends PlatformEvent<EquipmentUpdatedPayload> {
  readonly type: 'EquipmentUpdated';
}

/** Version of the {@link LpUpdatedEvent} contract. */
export const LP_UPDATED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link LpUpdatedEvent}. */
export interface LpUpdatedPayload {
  readonly id: string;
  readonly lpId: string;
  readonly equipmentId: EquipmentId;
  readonly changedFields: readonly string[];
  readonly updatedBy: UserId;
  readonly updatedAt: string;
}

/**
 * Published when platform lubrication point master data is created or updated.
 *
 * Source: `platform.lubrication-points`
 * Consumers: oil-lubrication, oil-analysis, future modules
 */
export interface LpUpdatedEvent extends PlatformEvent<LpUpdatedPayload> {
  readonly type: 'LpUpdated';
}

/** Version of the {@link LpDeactivatedEvent} contract. */
export const LP_DEACTIVATED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link LpDeactivatedEvent}. */
export interface LpDeactivatedPayload {
  readonly id: string;
  readonly lpId: string;
  readonly equipmentId: EquipmentId;
  readonly deactivatedBy: UserId;
  readonly deactivatedAt: string;
}

/**
 * Published when a lubrication point is deactivated in the platform master registry.
 *
 * Source: `platform.lubrication-points`
 * Consumers: oil-lubrication, oil-analysis, future modules
 */
export interface LpDeactivatedEvent extends PlatformEvent<LpDeactivatedPayload> {
  readonly type: 'LpDeactivated';
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
//
// Source module: platform identity service (platform.identity)
// Consumers: notification-service, owner-center, audit service
//
// Event coverage:
//   UserCreated · UserUpdated · UserArchived · UserRestored
//   UserSuspended · UserActivated
//   RoleAssigned · RoleRemoved
//   TemporaryRoleStarted · TemporaryRoleExpired
//   DelegationCreated · DelegationEnded
//   PermissionChanged

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

// ── User Archived ─────────────────────────────────────────────────────────────

/** Version of the {@link UserArchivedEvent} contract. */
export const USER_ARCHIVED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link UserArchivedEvent}. */
export interface UserArchivedPayload {
  readonly userId: UserId;
  readonly contractorId: ContractorId;
  /** User who performed the archive operation. */
  readonly archivedBy: UserId;
  /** ISO 8601 timestamp when the account was archived. */
  readonly archivedAt: string;
  /** Mandatory reason for archiving the account. */
  readonly reason: string;
}

/**
 * Published when a user account has been archived.
 *
 * Source module: platform identity service
 * Consumers: `notification-service`, `owner-center`, audit service
 */
export interface UserArchivedEvent extends PlatformEvent<UserArchivedPayload> {
  readonly type: 'UserArchived';
}

// ── User Restored ─────────────────────────────────────────────────────────────

/** Version of the {@link UserRestoredEvent} contract. */
export const USER_RESTORED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link UserRestoredEvent}. */
export interface UserRestoredPayload {
  readonly userId: UserId;
  readonly contractorId: ContractorId;
  readonly restoredBy: UserId;
  readonly restoredAt: string;
}

/**
 * Published when an archived user account has been restored to active status.
 *
 * Source module: platform identity service
 * Consumers: `owner-center`, audit service
 */
export interface UserRestoredEvent extends PlatformEvent<UserRestoredPayload> {
  readonly type: 'UserRestored';
}

// ── User Suspended ────────────────────────────────────────────────────────────

/** Version of the {@link UserSuspendedEvent} contract. */
export const USER_SUSPENDED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link UserSuspendedEvent}. */
export interface UserSuspendedPayload {
  readonly userId: UserId;
  readonly contractorId: ContractorId;
  readonly suspendedBy: UserId;
  readonly suspendedAt: string;
  /** Mandatory reason for suspension. */
  readonly reason: string;
}

/**
 * Published when a user account has been suspended.
 *
 * Suspended users retain their roles but cannot perform platform operations.
 *
 * Source module: platform identity service
 * Consumers: `notification-service`, `owner-center`, audit service
 */
export interface UserSuspendedEvent extends PlatformEvent<UserSuspendedPayload> {
  readonly type: 'UserSuspended';
}

// ── User Activated ────────────────────────────────────────────────────────────

/** Version of the {@link UserActivatedEvent} contract. */
export const USER_ACTIVATED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link UserActivatedEvent}. */
export interface UserActivatedPayload {
  readonly userId: UserId;
  readonly contractorId: ContractorId;
  readonly activatedBy: UserId;
  readonly activatedAt: string;
}

/**
 * Published when a suspended user account has been activated (unsuspended).
 *
 * Source module: platform identity service
 * Consumers: `owner-center`, audit service
 */
export interface UserActivatedEvent extends PlatformEvent<UserActivatedPayload> {
  readonly type: 'UserActivated';
}

// ── Role Assigned ─────────────────────────────────────────────────────────────

/** Version of the {@link RoleAssignedEvent} contract. */
export const ROLE_ASSIGNED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link RoleAssignedEvent}. */
export interface RoleAssignedPayload {
  readonly userId: UserId;
  readonly contractorId: ContractorId;
  /** The role that was assigned. */
  readonly role: string;
  readonly assignedBy: UserId;
  readonly assignedAt: string;
  readonly reason?: string;
}

/**
 * Published when a permanent role has been assigned to a user.
 *
 * Source module: platform identity service
 * Consumers: `owner-center`, audit service, any module that caches permissions
 */
export interface RoleAssignedEvent extends PlatformEvent<RoleAssignedPayload> {
  readonly type: 'RoleAssigned';
}

// ── Role Removed ──────────────────────────────────────────────────────────────

/** Version of the {@link RoleRemovedEvent} contract. */
export const ROLE_REMOVED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link RoleRemovedEvent}. */
export interface RoleRemovedPayload {
  readonly userId: UserId;
  readonly contractorId: ContractorId;
  readonly role: string;
  readonly removedBy: UserId;
  readonly removedAt: string;
}

/**
 * Published when a role has been removed from a user.
 *
 * Source module: platform identity service
 * Consumers: `owner-center`, audit service, any module that caches permissions
 */
export interface RoleRemovedEvent extends PlatformEvent<RoleRemovedPayload> {
  readonly type: 'RoleRemoved';
}

// ── Temporary Role Started ────────────────────────────────────────────────────

/** Version of the {@link TemporaryRoleStartedEvent} contract. */
export const TEMPORARY_ROLE_STARTED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link TemporaryRoleStartedEvent}. */
export interface TemporaryRoleStartedPayload {
  readonly userId: UserId;
  readonly contractorId: ContractorId;
  readonly role: string;
  readonly assignedBy: UserId;
  readonly assignedAt: string;
  /** ISO 8601 timestamp when the temporary role will expire. */
  readonly expiresAt: string;
  readonly reason?: string;
}

/**
 * Published when a temporary (time-limited) role has been assigned to a user.
 *
 * Source module: platform identity service
 * Consumers: `owner-center`, audit service, scheduler
 */
export interface TemporaryRoleStartedEvent extends PlatformEvent<TemporaryRoleStartedPayload> {
  readonly type: 'TemporaryRoleStarted';
}

// ── Temporary Role Expired ────────────────────────────────────────────────────

/** Version of the {@link TemporaryRoleExpiredEvent} contract. */
export const TEMPORARY_ROLE_EXPIRED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link TemporaryRoleExpiredEvent}. */
export interface TemporaryRoleExpiredPayload {
  readonly userId: UserId;
  readonly contractorId: ContractorId;
  readonly role: string;
  /** ISO 8601 timestamp when the role was detected as expired and removed. */
  readonly expiredAt: string;
}

/**
 * Published when a temporary role's expiry time has passed and it has been removed.
 *
 * Source module: platform identity service
 * Consumers: `owner-center`, audit service
 */
export interface TemporaryRoleExpiredEvent extends PlatformEvent<TemporaryRoleExpiredPayload> {
  readonly type: 'TemporaryRoleExpired';
}

// ── Delegation Created ────────────────────────────────────────────────────────

/** Version of the {@link DelegationCreatedEvent} contract. */
export const DELEGATION_CREATED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link DelegationCreatedEvent}. */
export interface DelegationCreatedPayload {
  readonly userId: UserId;
  readonly contractorId: ContractorId;
  readonly role: string;
  /** User who delegated the role. */
  readonly delegatedBy: UserId;
  /** Unique identifier for this delegation instance. */
  readonly delegationId: string;
  readonly createdAt: string;
  /** ISO 8601 timestamp when the delegation will expire. Optional. */
  readonly expiresAt?: string;
  readonly reason?: string;
}

/**
 * Published when a role delegation has been created from one user to another.
 *
 * Source module: platform identity service
 * Consumers: `owner-center`, audit service
 */
export interface DelegationCreatedEvent extends PlatformEvent<DelegationCreatedPayload> {
  readonly type: 'DelegationCreated';
}

// ── Delegation Ended ──────────────────────────────────────────────────────────

/** Version of the {@link DelegationEndedEvent} contract. */
export const DELEGATION_ENDED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link DelegationEndedEvent}. */
export interface DelegationEndedPayload {
  readonly userId: UserId;
  readonly contractorId: ContractorId;
  readonly role: string;
  readonly delegatedBy: UserId;
  readonly delegationId: string;
  readonly endedBy: UserId;
  readonly endedAt: string;
}

/**
 * Published when a role delegation has been explicitly ended.
 *
 * Source module: platform identity service
 * Consumers: `owner-center`, audit service
 */
export interface DelegationEndedEvent extends PlatformEvent<DelegationEndedPayload> {
  readonly type: 'DelegationEnded';
}

// ── Contractor Management Events ──────────────────────────────────────────────
//
// Source module: platform contractor service (platform.contractors)
// Consumers: notification-service, owner-center, audit service

/** Version of the {@link ContractorCreatedEvent} contract. */
export const CONTRACTOR_CREATED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link ContractorCreatedEvent}. */
export interface ContractorCreatedPayload {
  readonly id: string;
  readonly contractorCode: string;
  readonly name: string;
  readonly shortName: string;
  readonly email: string;
  readonly createdBy: string;
  readonly createdAt: string;
}

/** Published when a new contractor record has been created. */
export interface ContractorCreatedEvent extends PlatformEvent<ContractorCreatedPayload> {
  readonly type: 'ContractorCreated';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link ContractorUpdatedEvent} contract. */
export const CONTRACTOR_UPDATED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link ContractorUpdatedEvent}. */
export interface ContractorUpdatedPayload {
  readonly id: string;
  readonly contractorCode: string;
  readonly changedFields: readonly string[];
  readonly updatedBy: string;
  readonly updatedAt: string;
}

/** Published when a contractor record profile has been updated. */
export interface ContractorUpdatedEvent extends PlatformEvent<ContractorUpdatedPayload> {
  readonly type: 'ContractorUpdated';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link ContractorArchivedEvent} contract. */
export const CONTRACTOR_ARCHIVED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link ContractorArchivedEvent}. */
export interface ContractorArchivedPayload {
  readonly id: string;
  readonly contractorCode: string;
  readonly archivedBy: string;
  readonly archivedAt: string;
  readonly reason: string;
}

/** Published when a contractor record has been archived. */
export interface ContractorArchivedEvent extends PlatformEvent<ContractorArchivedPayload> {
  readonly type: 'ContractorArchived';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link ContractorRestoredEvent} contract. */
export const CONTRACTOR_RESTORED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link ContractorRestoredEvent}. */
export interface ContractorRestoredPayload {
  readonly id: string;
  readonly contractorCode: string;
  readonly restoredBy: string;
  readonly restoredAt: string;
}

/** Published when an archived contractor has been restored to active status. */
export interface ContractorRestoredEvent extends PlatformEvent<ContractorRestoredPayload> {
  readonly type: 'ContractorRestored';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link ContractorActivatedEvent} contract. */
export const CONTRACTOR_ACTIVATED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link ContractorActivatedEvent}. */
export interface ContractorActivatedPayload {
  readonly id: string;
  readonly contractorCode: string;
  readonly activatedBy: string;
  readonly activatedAt: string;
}

/** Published when an inactive contractor has been activated. */
export interface ContractorActivatedEvent extends PlatformEvent<ContractorActivatedPayload> {
  readonly type: 'ContractorActivated';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link ContractorDeactivatedEvent} contract. */
export const CONTRACTOR_DEACTIVATED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link ContractorDeactivatedPayload}. */
export interface ContractorDeactivatedPayload {
  readonly id: string;
  readonly contractorCode: string;
  readonly deactivatedBy: string;
  readonly deactivatedAt: string;
  readonly reason: string;
}

/** Published when an active contractor has been deactivated. */
export interface ContractorDeactivatedEvent extends PlatformEvent<ContractorDeactivatedPayload> {
  readonly type: 'ContractorDeactivated';
}

// ── Module Registry Events ─────────────────────────────────────────────────────
//
// Source module: platform module service (platform.modules)
// Consumers: notification-service, owner-center, audit service

/** Version of the {@link ModuleRegisteredEvent} contract. */
export const MODULE_REGISTERED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link ModuleRegisteredEvent}. */
export interface ModuleRegisteredPayload {
  readonly id: string;
  readonly moduleKey: string;
  readonly name: string;
  readonly version: string;
  readonly category: string;
  readonly registeredBy: string;
  readonly registeredAt: string;
}

/** Published when a new module record has been registered. */
export interface ModuleRegisteredEvent extends PlatformEvent<ModuleRegisteredPayload> {
  readonly type: 'ModuleRegistered';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link ModuleUpdatedEvent} contract. */
export const MODULE_UPDATED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link ModuleUpdatedEvent}. */
export interface ModuleUpdatedPayload {
  readonly id: string;
  readonly moduleKey: string;
  readonly changedFields: readonly string[];
  readonly updatedBy: string;
  readonly updatedAt: string;
}

/** Published when a module record profile has been updated. */
export interface ModuleUpdatedEvent extends PlatformEvent<ModuleUpdatedPayload> {
  readonly type: 'ModuleUpdated';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link ModuleEnabledEvent} contract. */
export const MODULE_ENABLED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link ModuleEnabledEvent}. */
export interface ModuleEnabledPayload {
  readonly id: string;
  readonly moduleKey: string;
  readonly enabledBy: string;
  readonly enabledAt: string;
}

/** Published when a disabled module has been enabled. */
export interface ModuleEnabledEvent extends PlatformEvent<ModuleEnabledPayload> {
  readonly type: 'ModuleEnabled';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link ModuleDisabledEvent} contract. */
export const MODULE_DISABLED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link ModuleDisabledEvent}. */
export interface ModuleDisabledPayload {
  readonly id: string;
  readonly moduleKey: string;
  readonly disabledBy: string;
  readonly disabledAt: string;
  readonly reason: string;
}

/** Published when an enabled module has been disabled. */
export interface ModuleDisabledEvent extends PlatformEvent<ModuleDisabledPayload> {
  readonly type: 'ModuleDisabled';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link ModuleMaintenanceStartedEvent} contract. */
export const MODULE_MAINTENANCE_STARTED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link ModuleMaintenanceStartedEvent}. */
export interface ModuleMaintenanceStartedPayload {
  readonly id: string;
  readonly moduleKey: string;
  readonly maintenanceStartedBy: string;
  readonly maintenanceStartedAt: string;
}

/** Published when a module has entered maintenance mode. */
export interface ModuleMaintenanceStartedEvent extends PlatformEvent<ModuleMaintenanceStartedPayload> {
  readonly type: 'ModuleMaintenanceStarted';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link ModuleMaintenanceEndedEvent} contract. */
export const MODULE_MAINTENANCE_ENDED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link ModuleMaintenanceEndedEvent}. */
export interface ModuleMaintenanceEndedPayload {
  readonly id: string;
  readonly moduleKey: string;
  readonly maintenanceEndedBy: string;
  readonly maintenanceEndedAt: string;
}

/** Published when a module has exited maintenance mode. */
export interface ModuleMaintenanceEndedEvent extends PlatformEvent<ModuleMaintenanceEndedPayload> {
  readonly type: 'ModuleMaintenanceEnded';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link ModuleRetiredEvent} contract. */
export const MODULE_RETIRED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link ModuleRetiredEvent}. */
export interface ModuleRetiredPayload {
  readonly id: string;
  readonly moduleKey: string;
  readonly retiredBy: string;
  readonly retiredAt: string;
  readonly reason: string;
}

/** Published when a module has been retired. */
export interface ModuleRetiredEvent extends PlatformEvent<ModuleRetiredPayload> {
  readonly type: 'ModuleRetired';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link ModuleRestoredEvent} contract. */
export const MODULE_RESTORED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link ModuleRestoredEvent}. */
export interface ModuleRestoredPayload {
  readonly id: string;
  readonly moduleKey: string;
  readonly restoredBy: string;
  readonly restoredAt: string;
}

/** Published when a retired module has been restored to enabled status. */
export interface ModuleRestoredEvent extends PlatformEvent<ModuleRestoredPayload> {
  readonly type: 'ModuleRestored';
}

// ── Notification Management Events ─────────────────────────────────────────────
//
// Source module: platform notification management service (platform.notification-management)
// Consumers: notification-service, owner-center, audit service

/** Version of the {@link NotificationRuleCreatedEvent} contract. */
export const NOTIFICATION_RULE_CREATED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link NotificationRuleCreatedEvent}. */
export interface NotificationRuleCreatedPayload {
  readonly id: string;
  readonly objectType: string;
  readonly ruleKey: string;
  readonly name: string;
  readonly createdBy: string;
  readonly createdAt: string;
}

/** Published when a new notification configuration record has been created. */
export interface NotificationRuleCreatedEvent extends PlatformEvent<NotificationRuleCreatedPayload> {
  readonly type: 'NotificationRuleCreated';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link NotificationRuleUpdatedEvent} contract. */
export const NOTIFICATION_RULE_UPDATED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link NotificationRuleUpdatedEvent}. */
export interface NotificationRuleUpdatedPayload {
  readonly id: string;
  readonly objectType: string;
  readonly ruleKey: string;
  readonly changedFields: readonly string[];
  readonly updatedBy: string;
  readonly updatedAt: string;
}

/** Published when a notification configuration record has been updated. */
export interface NotificationRuleUpdatedEvent extends PlatformEvent<NotificationRuleUpdatedPayload> {
  readonly type: 'NotificationRuleUpdated';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link NotificationRuleEnabledEvent} contract. */
export const NOTIFICATION_RULE_ENABLED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link NotificationRuleEnabledEvent}. */
export interface NotificationRuleEnabledPayload {
  readonly id: string;
  readonly objectType: string;
  readonly ruleKey: string;
  readonly enabledBy: string;
  readonly enabledAt: string;
}

/** Published when a disabled notification configuration has been enabled. */
export interface NotificationRuleEnabledEvent extends PlatformEvent<NotificationRuleEnabledPayload> {
  readonly type: 'NotificationRuleEnabled';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link NotificationRuleDisabledEvent} contract. */
export const NOTIFICATION_RULE_DISABLED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link NotificationRuleDisabledEvent}. */
export interface NotificationRuleDisabledPayload {
  readonly id: string;
  readonly objectType: string;
  readonly ruleKey: string;
  readonly disabledBy: string;
  readonly disabledAt: string;
  readonly reason: string;
}

/** Published when an enabled notification configuration has been disabled. */
export interface NotificationRuleDisabledEvent extends PlatformEvent<NotificationRuleDisabledPayload> {
  readonly type: 'NotificationRuleDisabled';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link NotificationRuleArchivedEvent} contract. */
export const NOTIFICATION_RULE_ARCHIVED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link NotificationRuleArchivedEvent}. */
export interface NotificationRuleArchivedPayload {
  readonly id: string;
  readonly objectType: string;
  readonly ruleKey: string;
  readonly archivedBy: string;
  readonly archivedAt: string;
  readonly reason: string;
}

/** Published when a notification configuration has been archived. */
export interface NotificationRuleArchivedEvent extends PlatformEvent<NotificationRuleArchivedPayload> {
  readonly type: 'NotificationRuleArchived';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link NotificationRuleRestoredEvent} contract. */
export const NOTIFICATION_RULE_RESTORED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link NotificationRuleRestoredEvent}. */
export interface NotificationRuleRestoredPayload {
  readonly id: string;
  readonly objectType: string;
  readonly ruleKey: string;
  readonly restoredBy: string;
  readonly restoredAt: string;
}

/** Published when an archived notification configuration has been restored. */
export interface NotificationRuleRestoredEvent extends PlatformEvent<NotificationRuleRestoredPayload> {
  readonly type: 'NotificationRuleRestored';
}

// ── Reporting & Analytics events ────────────────────────────────────────────────
//
// Source module: platform reporting service (platform.reporting)
// Consumers: owner-center, audit service

/** Version of the {@link ReportCreatedEvent} contract. */
export const REPORT_CREATED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link ReportCreatedEvent}. */
export interface ReportCreatedPayload {
  readonly id: string;
  readonly objectType: string;
  readonly reportKey: string;
  readonly name: string;
  readonly createdBy: string;
  readonly createdAt: string;
}

/** Published when a new reporting configuration record has been created. */
export interface ReportCreatedEvent extends PlatformEvent<ReportCreatedPayload> {
  readonly type: 'ReportCreated';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link ReportUpdatedEvent} contract. */
export const REPORT_UPDATED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link ReportUpdatedEvent}. */
export interface ReportUpdatedPayload {
  readonly id: string;
  readonly objectType: string;
  readonly reportKey: string;
  readonly changedFields: readonly string[];
  readonly updatedBy: string;
  readonly updatedAt: string;
}

/** Published when a reporting configuration record has been updated. */
export interface ReportUpdatedEvent extends PlatformEvent<ReportUpdatedPayload> {
  readonly type: 'ReportUpdated';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link ReportEnabledEvent} contract. */
export const REPORT_ENABLED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link ReportEnabledEvent}. */
export interface ReportEnabledPayload {
  readonly id: string;
  readonly objectType: string;
  readonly reportKey: string;
  readonly enabledBy: string;
  readonly enabledAt: string;
}

/** Published when a disabled reporting configuration has been enabled. */
export interface ReportEnabledEvent extends PlatformEvent<ReportEnabledPayload> {
  readonly type: 'ReportEnabled';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link ReportDisabledEvent} contract. */
export const REPORT_DISABLED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link ReportDisabledEvent}. */
export interface ReportDisabledPayload {
  readonly id: string;
  readonly objectType: string;
  readonly reportKey: string;
  readonly disabledBy: string;
  readonly disabledAt: string;
  readonly reason: string;
}

/** Published when an enabled reporting configuration has been disabled. */
export interface ReportDisabledEvent extends PlatformEvent<ReportDisabledPayload> {
  readonly type: 'ReportDisabled';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link ReportArchivedEvent} contract. */
export const REPORT_ARCHIVED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link ReportArchivedEvent}. */
export interface ReportArchivedPayload {
  readonly id: string;
  readonly objectType: string;
  readonly reportKey: string;
  readonly archivedBy: string;
  readonly archivedAt: string;
  readonly reason: string;
}

/** Published when a reporting configuration has been archived. */
export interface ReportArchivedEvent extends PlatformEvent<ReportArchivedPayload> {
  readonly type: 'ReportArchived';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link ReportRestoredEvent} contract. */
export const REPORT_RESTORED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link ReportRestoredEvent}. */
export interface ReportRestoredPayload {
  readonly id: string;
  readonly objectType: string;
  readonly reportKey: string;
  readonly restoredBy: string;
  readonly restoredAt: string;
}

/** Published when an archived reporting configuration has been restored. */
export interface ReportRestoredEvent extends PlatformEvent<ReportRestoredPayload> {
  readonly type: 'ReportRestored';
}

// ── Workflow & Approval events ────────────────────────────────────────────────

/** Version of the {@link WorkflowDefinitionCreatedEvent} contract. */
export const WORKFLOW_DEFINITION_CREATED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link WorkflowDefinitionCreatedEvent}. */
export interface WorkflowDefinitionCreatedPayload {
  readonly id: string;
  readonly workflowKey: string;
  readonly name: string;
  readonly workflowType: string;
  readonly createdBy: string;
  readonly createdAt: string;
}

/** Published when a new workflow definition has been created. */
export interface WorkflowDefinitionCreatedEvent extends PlatformEvent<WorkflowDefinitionCreatedPayload> {
  readonly type: 'WorkflowDefinitionCreated';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link WorkflowPublishedEvent} contract. */
export const WORKFLOW_PUBLISHED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link WorkflowPublishedEvent}. */
export interface WorkflowPublishedPayload {
  readonly id: string;
  readonly workflowKey: string;
  readonly version: number;
  readonly publishedBy: string;
  readonly publishedAt: string;
}

/** Published when a workflow definition has been published. */
export interface WorkflowPublishedEvent extends PlatformEvent<WorkflowPublishedPayload> {
  readonly type: 'WorkflowPublished';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link WorkflowDisabledEvent} contract. */
export const WORKFLOW_DISABLED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link WorkflowDisabledEvent}. */
export interface WorkflowDisabledPayload {
  readonly id: string;
  readonly workflowKey: string;
  readonly disabledBy: string;
  readonly disabledAt: string;
  readonly reason: string;
}

/** Published when a published workflow definition has been disabled. */
export interface WorkflowDisabledEvent extends PlatformEvent<WorkflowDisabledPayload> {
  readonly type: 'WorkflowDisabled';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link WorkflowArchivedEvent} contract. */
export const WORKFLOW_ARCHIVED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link WorkflowArchivedEvent}. */
export interface WorkflowArchivedPayload {
  readonly id: string;
  readonly workflowKey: string;
  readonly archivedBy: string;
  readonly archivedAt: string;
  readonly reason: string;
}

/** Published when a workflow definition has been archived. */
export interface WorkflowArchivedEvent extends PlatformEvent<WorkflowArchivedPayload> {
  readonly type: 'WorkflowArchived';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link WorkflowStartedEvent} contract. */
export const WORKFLOW_STARTED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link WorkflowStartedEvent}. */
export interface WorkflowStartedPayload {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly workflowKey: string;
  readonly definitionVersion: number;
  readonly startedBy: string;
  readonly startedAt: string;
}

/** Published when a workflow instance has been started. */
export interface WorkflowStartedEvent extends PlatformEvent<WorkflowStartedPayload> {
  readonly type: 'WorkflowStarted';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link StepApprovedEvent} contract. */
export const STEP_APPROVED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link StepApprovedEvent}. */
export interface StepApprovedPayload {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly workflowKey: string;
  readonly stepKey: string;
  readonly approvedBy: string;
  readonly approvedAt: string;
}

/** Published when a workflow step has been approved. */
export interface StepApprovedEvent extends PlatformEvent<StepApprovedPayload> {
  readonly type: 'StepApproved';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link StepRejectedEvent} contract. */
export const STEP_REJECTED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link StepRejectedEvent}. */
export interface StepRejectedPayload {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly workflowKey: string;
  readonly stepKey: string;
  readonly rejectedBy: string;
  readonly rejectedAt: string;
  readonly reason: string;
}

/** Published when a workflow step has been rejected. */
export interface StepRejectedEvent extends PlatformEvent<StepRejectedPayload> {
  readonly type: 'StepRejected';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link WorkflowCancelledEvent} contract. */
export const WORKFLOW_CANCELLED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link WorkflowCancelledEvent}. */
export interface WorkflowCancelledPayload {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly workflowKey: string;
  readonly cancelledBy: string;
  readonly cancelledAt: string;
  readonly reason: string;
}

/** Published when a workflow instance has been cancelled. */
export interface WorkflowCancelledEvent extends PlatformEvent<WorkflowCancelledPayload> {
  readonly type: 'WorkflowCancelled';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Version of the {@link WorkflowCompletedEvent} contract. */
export const WORKFLOW_COMPLETED_VERSION: ContractVersion = '1.0';

/** Data payload for the {@link WorkflowCompletedEvent}. */
export interface WorkflowCompletedPayload {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly workflowKey: string;
  readonly completedAt: string;
}

/** Published when a workflow instance has reached a terminal success state. */
export interface WorkflowCompletedEvent extends PlatformEvent<WorkflowCompletedPayload> {
  readonly type: 'WorkflowCompleted';
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
  | EquipmentUpdatedEvent
  | LpUpdatedEvent
  | LpDeactivatedEvent
  | RouteAssignedEvent
  | RouteCompletedEvent
  | HealthStatusChangedEvent
  | UserCreatedEvent
  | UserUpdatedEvent
  | UserArchivedEvent
  | UserRestoredEvent
  | UserSuspendedEvent
  | UserActivatedEvent
  | RoleAssignedEvent
  | RoleRemovedEvent
  | TemporaryRoleStartedEvent
  | TemporaryRoleExpiredEvent
  | DelegationCreatedEvent
  | DelegationEndedEvent
  | PermissionChangedEvent
  | ContractorCreatedEvent
  | ContractorUpdatedEvent
  | ContractorArchivedEvent
  | ContractorRestoredEvent
  | ContractorActivatedEvent
  | ContractorDeactivatedEvent
  | ModuleRegisteredEvent
  | ModuleUpdatedEvent
  | ModuleEnabledEvent
  | ModuleDisabledEvent
  | ModuleMaintenanceStartedEvent
  | ModuleMaintenanceEndedEvent
  | ModuleRetiredEvent
  | ModuleRestoredEvent
  | NotificationRuleCreatedEvent
  | NotificationRuleUpdatedEvent
  | NotificationRuleEnabledEvent
  | NotificationRuleDisabledEvent
  | NotificationRuleArchivedEvent
  | NotificationRuleRestoredEvent
  | ReportCreatedEvent
  | ReportUpdatedEvent
  | ReportEnabledEvent
  | ReportDisabledEvent
  | ReportArchivedEvent
  | ReportRestoredEvent
  | WorkflowDefinitionCreatedEvent
  | WorkflowPublishedEvent
  | WorkflowDisabledEvent
  | WorkflowArchivedEvent
  | WorkflowStartedEvent
  | StepApprovedEvent
  | StepRejectedEvent
  | WorkflowCancelledEvent
  | WorkflowCompletedEvent;

/** Extracts the `type` discriminant literal from {@link AnyPlatformEvent}. */
export type PlatformEventType = AnyPlatformEvent['type'];
