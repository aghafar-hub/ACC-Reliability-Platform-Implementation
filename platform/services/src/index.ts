// platform/services/src/index.ts
// Public API surface for @acc-reliability/services
//
// Only types and interfaces that business modules legitimately consume are
// exported here.  Internal implementation details remain private.

// ── Authentication — Types ────────────────────────────────────────────────────
export type {
  ContractorId,
  UserId,
  SessionId,
  KnownContractorCode,
  UserRole,
  UserContext,
  SessionInfo,
  AuthCredentials,
  PasswordCredentials,
  TokenCredentials,
  IAuthService,
} from './auth/auth-types';

export {
  KNOWN_CONTRACTORS,
  createContractorId,
  createUserId,
  createSessionId,
} from './auth/auth-types';

export type {
  SessionData,
  IAuthRepository,
  IAuthProvider,
} from './auth/auth-types';

// ── Authentication — Implementation ───────────────────────────────────────────
export { AuthService } from './auth/auth-service';
export { InMemoryAuthRepository } from './auth/auth-repository';

// ── Authorization — Types ─────────────────────────────────────────────────────
export type {
  AppRole,
  KnownAppRole,
  ContractorScope,
  ModuleId,
  KnownModuleId,
  ActionType,
  KnownActionType,
  PermissionEntry,
  PermissionRequest,
  IPermissionService,
} from './authz/authz-types';

export {
  PLATFORM_ROLES,
  KNOWN_MODULES,
  KNOWN_ACTIONS,
} from './authz/authz-types';

// ── Authorization — Implementation ────────────────────────────────────────────
export { PermissionService } from './authz/permission-service';

// ── Authorization — Event Tokens ──────────────────────────────────────────────
export { PERMISSION_CHANGED_TOKEN } from './authz/permission-event-tokens';

// ── Storage — Query types ─────────────────────────────────────────────────────
export type {
  FilterOperator,
  FieldFilter,
  CompositeFilter,
  FilterExpression,
  SortDirection,
  SortClause,
  PageRequest,
  PageResult,
  QueryOptions,
  PagedQueryOptions,
} from './storage/query-types';

// ── Storage — Provider and repository types ───────────────────────────────────
export type {
  StorageProviderKind,
  GoogleSheetsProviderConfig,
  SqlServerProviderConfig,
  PostgreSQLProviderConfig,
  SQLiteProviderConfig,
  MockStorageProviderConfig,
  StorageProviderConfig,
  StorageHealthState,
  StorageHealthStatus,
  Entity,
  ITransaction,
  IRepository,
  IStorageProvider,
} from './storage/storage-types';

// ── Communication Contracts — Correlation identifiers ─────────────────────────
export type {
  CorrelationId,
  MessageId,
  RequestId,
  EventId,
  TraceId,
  OperationId,
} from './contracts/correlation';

export {
  createCorrelationId,
  createMessageId,
  createRequestId,
  createEventId,
  createTraceId,
  createOperationId,
} from './contracts/correlation';

// ── Communication Contracts — Shared types ────────────────────────────────────
export type {
  EquipmentId,
  KnownPlatformModule,
  PlatformModule,
  MessagePriority,
  ContractVersion,
  MessageMetadata,
  PlatformEvent,
  PlatformMessage,
} from './contracts/communication-types';

export {
  PLATFORM_MODULES,
  CONTRACT_VERSION_1_0,
  createEquipmentId,
} from './contracts/communication-types';

// ── Communication Contracts — Platform events ─────────────────────────────────
export type {
  OilChangeCompletedPayload,
  OilChangeCompletedEvent,
  OilAnalysisParameter,
  OilAnalysisCompletedPayload,
  OilAnalysisCompletedEvent,
  OilAnalysisCriticalPayload,
  OilAnalysisCriticalEvent,
  ResampleRequiredPayload,
  ResampleRequiredEvent,
  ActionCreatedPayload,
  ActionCreatedEvent,
  ActionCompletedPayload,
  ActionCompletedEvent,
  EquipmentStatus,
  EquipmentStatusChangedPayload,
  EquipmentStatusChangedEvent,
  RouteAssignedPayload,
  RouteAssignedEvent,
  RouteCompletedPayload,
  RouteCompletedEvent,
  ComponentHealthStatus,
  HealthStatusChangedPayload,
  HealthStatusChangedEvent,
  UserCreatedPayload,
  UserCreatedEvent,
  UserUpdatedPayload,
  UserUpdatedEvent,
  PermissionChange,
  PermissionChangedPayload,
  PermissionChangedEvent,
  AnyPlatformEvent,
  PlatformEventType,
} from './contracts/platform-events';

export {
  OIL_CHANGE_COMPLETED_VERSION,
  OIL_ANALYSIS_COMPLETED_VERSION,
  OIL_ANALYSIS_CRITICAL_VERSION,
  RESAMPLE_REQUIRED_VERSION,
  ACTION_CREATED_VERSION,
  ACTION_COMPLETED_VERSION,
  EQUIPMENT_STATUS_CHANGED_VERSION,
  ROUTE_ASSIGNED_VERSION,
  ROUTE_COMPLETED_VERSION,
  HEALTH_STATUS_CHANGED_VERSION,
  USER_CREATED_VERSION,
  USER_UPDATED_VERSION,
  PERMISSION_CHANGED_VERSION,
} from './contracts/platform-events';

// ── Communication Contracts — Platform messages ───────────────────────────────
export type {
  OilChangeRequestedPayload,
  OilChangeRequestedMessage,
  NotificationRequestedPayload,
  NotificationRequestedMessage,
  AnyPlatformMessage,
  PlatformMessageType,
} from './contracts/platform-messages';

export {
  OIL_CHANGE_REQUESTED_VERSION,
  NOTIFICATION_REQUESTED_VERSION,
} from './contracts/platform-messages';

// ── Health Service — Types ────────────────────────────────────────────────────
export type {
  HealthStatus,
  KnownHealthCategory,
  HealthComponentCategory,
  HealthCheckOutcome,
  HealthCheckFn,
  HealthComponentRegistration,
  HealthCheckResult,
  HealthComponentStatus,
  HealthSummary,
  HealthServiceOptions,
  IHealthService,
} from './health/health-types';

export {
  HEALTH_CATEGORIES,
  DEFAULT_HEALTH_CHECK_TIMEOUT_MS,
} from './health/health-types';

// ── Health Service — Implementation ──────────────────────────────────────────
export { HealthService } from './health/health-service';

// ── Metrics Service — Types ───────────────────────────────────────────────────
export type {
  MetricId,
  MetricKind,
  KnownMetricCategory,
  MetricCategory,
  MetricLevel,
  MetricValue,
  MetricTags,
  MetricDefinition,
  MetricSample,
  MetricSnapshot,
  MetricSummary,
  MetricsServiceOptions,
  IMetricsService,
} from './metrics/metrics-types';

export {
  METRIC_CATEGORIES,
  createMetricId,
} from './metrics/metrics-types';

// ── Metrics Service — Implementation ─────────────────────────────────────────
export { MetricsService } from './metrics/metrics-service';

// ── Notification Service — Types ──────────────────────────────────────────────
export type {
  NotificationId,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  NotificationRecipient,
  NotificationPayload,
  NotificationRequest,
  NotificationRecord,
  NotificationSummary,
  NotificationServiceOptions,
  INotificationService,
} from './notification/notification-types';

export {
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  createNotificationId,
  generateNotificationId,
} from './notification/notification-types';

// ── Notification Service — Implementation ─────────────────────────────────────
export { NotificationService } from './notification/notification-service';

// ── Action Service — Types ────────────────────────────────────────────────────
export type {
  ActionId,
  ActionKind,
  ActionPriority,
  ActionStatus,
  AssigneeKind,
  ActionAssignment,
  ActionFollower,
  ActionComment,
  ActionAttachment,
  ActionApproval,
  ActionHistoryEntry,
  ActionRecord,
  ActionCreateRequest,
  ActionUpdateRequest,
  ActionSummary,
  ActionServiceOptions,
  IActionService,
} from './action/action-types';

export {
  ACTION_KINDS,
  ACTION_PRIORITIES,
  createActionId,
  generateActionId,
} from './action/action-types';

// ── Action Service — Implementation ───────────────────────────────────────────
export { ActionService } from './action/action-service';

// ── Audit Service — Types ─────────────────────────────────────────────────────
export type {
  AuditId,
  AuditCategory,
  KnownAuditCategory,
  AuditAction,
  KnownAuditAction,
  AuditOutcome,
  AuditSeverity,
  HighRiskSeverity,
  AuditClientType,
  KnownAuditClientType,
  AuditActor,
  AuditResource,
  AuditRequest,
  AuditEntry,
  AuditQuery,
  AuditTimeline,
  AuditServiceOptions,
  IAuditService,
} from './audit/audit-types';

export {
  AUDIT_CATEGORIES,
  AUDIT_ACTIONS,
  AUDIT_SEVERITIES,
  HIGH_RISK_SEVERITIES,
  AUDIT_CLIENT_TYPES,
  createAuditId,
  generateAuditId,
} from './audit/audit-types';

// ── Audit Service — Implementation ────────────────────────────────────────────
export { AuditService } from './audit/audit-service';

// ── User Management — Types ───────────────────────────────────────────────────
export type {
  UserStatus,
  DelegationId,
  ActorRef,
  RoleAssignment,
  UserRecord,
  CreateUserRequest,
  UpdateUserRequest,
  AssignRoleRequest,
  AssignTemporaryRoleRequest,
  CreateDelegationRequest,
  UserListQuery,
  UserListResult,
  IUserRepository,
  IUserService,
} from './user/user-types';

export {
  USER_STATUSES,
  createDelegationId,
  generateDelegationId,
  generateUserRecordId,
} from './user/user-types';

// ── User Management — Repository ──────────────────────────────────────────────
export { InMemoryUserRepository } from './user/user-repository';

// ── User Management — Service ─────────────────────────────────────────────────
export { UserService } from './user/user-service';

// ── User Management — Event Tokens ────────────────────────────────────────────
export {
  USER_CREATED_TOKEN,
  USER_UPDATED_TOKEN,
  USER_ARCHIVED_TOKEN,
  USER_RESTORED_TOKEN,
  USER_SUSPENDED_TOKEN,
  USER_ACTIVATED_TOKEN,
  ROLE_ASSIGNED_TOKEN,
  ROLE_REMOVED_TOKEN,
  TEMPORARY_ROLE_STARTED_TOKEN,
  TEMPORARY_ROLE_EXPIRED_TOKEN,
  DELEGATION_CREATED_TOKEN,
  DELEGATION_ENDED_TOKEN,
} from './user/user-event-tokens';

// ── User Management — Extended Platform Events ────────────────────────────────
export type {
  UserArchivedPayload,
  UserArchivedEvent,
  UserRestoredPayload,
  UserRestoredEvent,
  UserSuspendedPayload,
  UserSuspendedEvent,
  UserActivatedPayload,
  UserActivatedEvent,
  RoleAssignedPayload,
  RoleAssignedEvent,
  RoleRemovedPayload,
  RoleRemovedEvent,
  TemporaryRoleStartedPayload,
  TemporaryRoleStartedEvent,
  TemporaryRoleExpiredPayload,
  TemporaryRoleExpiredEvent,
  DelegationCreatedPayload,
  DelegationCreatedEvent,
  DelegationEndedPayload,
  DelegationEndedEvent,
} from './contracts/platform-events';

export {
  USER_ARCHIVED_VERSION,
  USER_RESTORED_VERSION,
  USER_SUSPENDED_VERSION,
  USER_ACTIVATED_VERSION,
  ROLE_ASSIGNED_VERSION,
  ROLE_REMOVED_VERSION,
  TEMPORARY_ROLE_STARTED_VERSION,
  TEMPORARY_ROLE_EXPIRED_VERSION,
  DELEGATION_CREATED_VERSION,
  DELEGATION_ENDED_VERSION,
} from './contracts/platform-events';

// ── Contractor Management — Types ─────────────────────────────────────────────
export type {
  ContractorStatus,
  ContractorRecordId,
  EquipmentScope,
  ContractorRecord,
  CreateContractorRequest,
  UpdateContractorRequest,
  ContractorListQuery,
  ContractorListResult,
  IContractorRepository,
  IContractorService,
} from './contractor/contractor-types';

export {
  CONTRACTOR_STATUSES,
  generateContractorRecordId,
  createContractorRecordId,
} from './contractor/contractor-types';

// ── Contractor Management — Repository ────────────────────────────────────────
export { InMemoryContractorRepository } from './contractor/contractor-repository';

// ── Contractor Management — Service ──────────────────────────────────────────
export { ContractorService } from './contractor/contractor-service';

// ── Contractor Management — Event Tokens ─────────────────────────────────────
export {
  CONTRACTOR_CREATED_TOKEN,
  CONTRACTOR_UPDATED_TOKEN,
  CONTRACTOR_ARCHIVED_TOKEN,
  CONTRACTOR_RESTORED_TOKEN,
  CONTRACTOR_ACTIVATED_TOKEN,
  CONTRACTOR_DEACTIVATED_TOKEN,
} from './contractor/contractor-event-tokens';

// ── Contractor Management — Extended Platform Events ─────────────────────────
export type {
  ContractorCreatedPayload,
  ContractorCreatedEvent,
  ContractorUpdatedPayload,
  ContractorUpdatedEvent,
  ContractorArchivedPayload,
  ContractorArchivedEvent,
  ContractorRestoredPayload,
  ContractorRestoredEvent,
  ContractorActivatedPayload,
  ContractorActivatedEvent,
  ContractorDeactivatedPayload,
  ContractorDeactivatedEvent,
} from './contracts/platform-events';

export {
  CONTRACTOR_CREATED_VERSION,
  CONTRACTOR_UPDATED_VERSION,
  CONTRACTOR_ARCHIVED_VERSION,
  CONTRACTOR_RESTORED_VERSION,
  CONTRACTOR_ACTIVATED_VERSION,
  CONTRACTOR_DEACTIVATED_VERSION,
} from './contracts/platform-events';

// ── Module Registry — Types ───────────────────────────────────────────────────
export type {
  ModuleStatus,
  ModuleHealthStatus,
  ModuleConfigStatus,
  ModuleLocalizationStatus,
  ModuleLearningStatus,
  ModuleSearchStatus,
  ModuleVisibility,
  ModuleRecordId,
  ModuleRecord,
  RegisterModuleRequest,
  UpdateModuleRequest,
  ModuleListQuery,
  ModuleListResult,
  IModuleRepository,
  IModuleService,
} from './module/module-types';

export {
  MODULE_STATUSES,
  generateModuleRecordId,
  createModuleRecordId,
} from './module/module-types';

// ── Module Registry — Repository ──────────────────────────────────────────────
export { InMemoryModuleRepository } from './module/module-repository';

// ── Module Registry — Service ─────────────────────────────────────────────────
export { ModuleService } from './module/module-service';

// ── Module Registry — Event Tokens ────────────────────────────────────────────
export {
  MODULE_REGISTERED_TOKEN,
  MODULE_UPDATED_TOKEN,
  MODULE_ENABLED_TOKEN,
  MODULE_DISABLED_TOKEN,
  MODULE_MAINTENANCE_STARTED_TOKEN,
  MODULE_MAINTENANCE_ENDED_TOKEN,
  MODULE_RETIRED_TOKEN,
  MODULE_RESTORED_TOKEN,
} from './module/module-event-tokens';

// ── Module Registry — Extended Platform Events ────────────────────────────────
export type {
  ModuleRegisteredPayload,
  ModuleRegisteredEvent,
  ModuleUpdatedPayload,
  ModuleUpdatedEvent,
  ModuleEnabledPayload,
  ModuleEnabledEvent,
  ModuleDisabledPayload,
  ModuleDisabledEvent,
  ModuleMaintenanceStartedPayload,
  ModuleMaintenanceStartedEvent,
  ModuleMaintenanceEndedPayload,
  ModuleMaintenanceEndedEvent,
  ModuleRetiredPayload,
  ModuleRetiredEvent,
  ModuleRestoredPayload,
  ModuleRestoredEvent,
} from './contracts/platform-events';

export {
  MODULE_REGISTERED_VERSION,
  MODULE_UPDATED_VERSION,
  MODULE_ENABLED_VERSION,
  MODULE_DISABLED_VERSION,
  MODULE_MAINTENANCE_STARTED_VERSION,
  MODULE_MAINTENANCE_ENDED_VERSION,
  MODULE_RETIRED_VERSION,
  MODULE_RESTORED_VERSION,
} from './contracts/platform-events';

// ── Notification Management — Types ───────────────────────────────────────────
export type {
  NotificationObjectType,
  NotificationRuleStatus,
  NotificationRuleId,
  NotificationRuleSettings,
  NotificationRuleRecord,
  CreateNotificationRuleRequest,
  UpdateNotificationRuleRequest,
  NotificationRuleListQuery,
  NotificationRuleListResult,
  NotificationManagementSummary,
  INotificationManagementRepository,
  INotificationManagementService,
} from './notification-management/notification-management-types';

export {
  NOTIFICATION_OBJECT_TYPES,
  NOTIFICATION_RULE_STATUSES,
  generateNotificationRuleId,
  createNotificationRuleId,
} from './notification-management/notification-management-types';

// ── Notification Management — Repository ──────────────────────────────────────
export { InMemoryNotificationManagementRepository } from './notification-management/notification-management-repository';

// ── Notification Management — Service ─────────────────────────────────────────
export { NotificationManagementService } from './notification-management/notification-management-service';

// ── Notification Management — Event Tokens ────────────────────────────────────
export {
  NOTIFICATION_RULE_CREATED_TOKEN,
  NOTIFICATION_RULE_UPDATED_TOKEN,
  NOTIFICATION_RULE_ENABLED_TOKEN,
  NOTIFICATION_RULE_DISABLED_TOKEN,
  NOTIFICATION_RULE_ARCHIVED_TOKEN,
  NOTIFICATION_RULE_RESTORED_TOKEN,
} from './notification-management/notification-management-event-tokens';

// ── Notification Management — Extended Platform Events ──────────────────────────
export type {
  NotificationRuleCreatedPayload,
  NotificationRuleCreatedEvent,
  NotificationRuleUpdatedPayload,
  NotificationRuleUpdatedEvent,
  NotificationRuleEnabledPayload,
  NotificationRuleEnabledEvent,
  NotificationRuleDisabledPayload,
  NotificationRuleDisabledEvent,
  NotificationRuleArchivedPayload,
  NotificationRuleArchivedEvent,
  NotificationRuleRestoredPayload,
  NotificationRuleRestoredEvent,
} from './contracts/platform-events';

export {
  NOTIFICATION_RULE_CREATED_VERSION,
  NOTIFICATION_RULE_UPDATED_VERSION,
  NOTIFICATION_RULE_ENABLED_VERSION,
  NOTIFICATION_RULE_DISABLED_VERSION,
  NOTIFICATION_RULE_ARCHIVED_VERSION,
  NOTIFICATION_RULE_RESTORED_VERSION,
} from './contracts/platform-events';

// ── Reporting — Types ─────────────────────────────────────────────────────────
export type {
  ReportObjectType,
  ReportStatus,
  ExportFormat,
  ReportId,
  ReportSettings,
  ReportRecord,
  CreateReportRequest,
  UpdateReportRequest,
  ReportListQuery,
  ReportListResult,
  ReportingSummary,
  IReportingRepository,
  IReportingService,
} from './reporting/reporting-types';

export {
  REPORT_OBJECT_TYPES,
  REPORT_STATUSES,
  EXPORT_FORMATS,
  generateReportId,
  createReportId,
} from './reporting/reporting-types';

// ── Reporting — Repository ────────────────────────────────────────────────────
export { InMemoryReportingRepository } from './reporting/reporting-repository';

// ── Reporting — Service ───────────────────────────────────────────────────────
export { ReportingService } from './reporting/reporting-service';

// ── Reporting — Event Tokens ──────────────────────────────────────────────────
export {
  REPORT_CREATED_TOKEN,
  REPORT_UPDATED_TOKEN,
  REPORT_ENABLED_TOKEN,
  REPORT_DISABLED_TOKEN,
  REPORT_ARCHIVED_TOKEN,
  REPORT_RESTORED_TOKEN,
} from './reporting/reporting-event-tokens';

// ── Reporting — Extended Platform Events ──────────────────────────────────────
export type {
  ReportCreatedPayload,
  ReportCreatedEvent,
  ReportUpdatedPayload,
  ReportUpdatedEvent,
  ReportEnabledPayload,
  ReportEnabledEvent,
  ReportDisabledPayload,
  ReportDisabledEvent,
  ReportArchivedPayload,
  ReportArchivedEvent,
  ReportRestoredPayload,
  ReportRestoredEvent,
} from './contracts/platform-events';

export {
  REPORT_CREATED_VERSION,
  REPORT_UPDATED_VERSION,
  REPORT_ENABLED_VERSION,
  REPORT_DISABLED_VERSION,
  REPORT_ARCHIVED_VERSION,
  REPORT_RESTORED_VERSION,
} from './contracts/platform-events';

// ── Workflow & Approval — Types ───────────────────────────────────────────────
export type {
  WorkflowDefinitionStatus,
  WorkflowType,
  WorkflowInstanceStatus,
  WorkflowStepStatus,
  WorkflowDefinitionId,
  WorkflowInstanceId,
  WorkflowStep,
  ApprovalRule,
  EscalationRule,
  SlaRule,
  ConditionRule,
  ConditionOperator,
  WorkflowVersion,
  WorkflowStepState,
  WorkflowDefinitionRecord,
  WorkflowInstanceRecord,
  CreateWorkflowDefinitionRequest,
  UpdateWorkflowDefinitionRequest,
  WorkflowDefinitionListQuery,
  WorkflowDefinitionListResult,
  WorkflowInstanceListQuery,
  WorkflowInstanceListResult,
  WorkflowSummary,
  IWorkflowRepository,
  IWorkflowService,
} from './workflow/workflow-types';

export {
  WORKFLOW_DEFINITION_STATUSES,
  WORKFLOW_TYPES,
  WORKFLOW_INSTANCE_STATUSES,
  WORKFLOW_STEP_STATUSES,
  generateWorkflowDefinitionId,
  generateWorkflowInstanceId,
  createWorkflowDefinitionId,
  createWorkflowInstanceId,
} from './workflow/workflow-types';

// ── Workflow & Approval — Repository ────────────────────────────────────────────
export { InMemoryWorkflowRepository } from './workflow/workflow-repository';

// ── Workflow & Approval — Service ─────────────────────────────────────────────
export { WorkflowService } from './workflow/workflow-service';

// ── Workflow & Approval — Event Tokens ────────────────────────────────────────
export {
  WORKFLOW_DEFINITION_CREATED_TOKEN,
  WORKFLOW_PUBLISHED_TOKEN,
  WORKFLOW_DISABLED_TOKEN,
  WORKFLOW_ARCHIVED_TOKEN,
  WORKFLOW_STARTED_TOKEN,
  STEP_APPROVED_TOKEN,
  STEP_REJECTED_TOKEN,
  WORKFLOW_CANCELLED_TOKEN,
  WORKFLOW_COMPLETED_TOKEN,
} from './workflow/workflow-event-tokens';

// ── Workflow & Approval — Extended Platform Events ─────────────────────────────
export type {
  WorkflowDefinitionCreatedPayload,
  WorkflowDefinitionCreatedEvent,
  WorkflowPublishedPayload,
  WorkflowPublishedEvent,
  WorkflowDisabledPayload,
  WorkflowDisabledEvent,
  WorkflowArchivedPayload,
  WorkflowArchivedEvent,
  WorkflowStartedPayload,
  WorkflowStartedEvent,
  StepApprovedPayload,
  StepApprovedEvent,
  StepRejectedPayload,
  StepRejectedEvent,
  WorkflowCancelledPayload,
  WorkflowCancelledEvent,
  WorkflowCompletedPayload,
  WorkflowCompletedEvent,
} from './contracts/platform-events';

export {
  WORKFLOW_DEFINITION_CREATED_VERSION,
  WORKFLOW_PUBLISHED_VERSION,
  WORKFLOW_DISABLED_VERSION,
  WORKFLOW_ARCHIVED_VERSION,
  WORKFLOW_STARTED_VERSION,
  STEP_APPROVED_VERSION,
  STEP_REJECTED_VERSION,
  WORKFLOW_CANCELLED_VERSION,
  WORKFLOW_COMPLETED_VERSION,
} from './contracts/platform-events';

// ── Errors ────────────────────────────────────────────────────────────────────
export {
  AuthError,
  AuthenticationError,
  SessionExpiredError,
  AuthorizationError,
  PermissionDeniedError,
  StorageError,
  ConnectionError,
  QueryError,
  EntityNotFoundError,
  DuplicateEntityError,
  TransactionError,
  HealthError,
  HealthCheckTimeoutError,
  HealthComponentNotFoundError,
  MetricsError,
  MetricNotFoundError,
  MetricAlreadyRegisteredError,
  NotificationError,
  NotificationNotFoundError,
  NotificationRecipientError,
  ActionError,
  ActionNotFoundError,
  ActionScopeError,
  ActionTransitionError,
  AuditError,
  AuditEntryNotFoundError,
  AuditValidationError,
  UserError,
  UserNotFoundError,
  UserDuplicateError,
  UserLifecycleError,
  ContractorError,
  ContractorNotFoundError,
  ContractorDuplicateError,
  ContractorLifecycleError,
  ModuleError,
  ModuleNotFoundError,
  ModuleDuplicateError,
  ModuleLifecycleError,
  NotificationManagementError,
  NotificationRuleNotFoundError,
  NotificationRuleDuplicateError,
  NotificationRuleLifecycleError,
  ReportingError,
  ReportNotFoundError,
  ReportDuplicateError,
  ReportLifecycleError,
  WorkflowError,
  WorkflowDefinitionNotFoundError,
  WorkflowInstanceNotFoundError,
  WorkflowDefinitionDuplicateError,
  WorkflowLifecycleError,
  WorkflowInstanceLifecycleError,
} from './errors';
