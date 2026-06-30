// platform/sdk/src/index.ts
// Public API surface for @acc-reliability/sdk.
//
// Business modules import from this package only.  They must not import
// from @acc-reliability/kernel, @acc-reliability/services, or
// @acc-reliability/storage directly (PS-114 SDK-002).
//
// Applications bootstrap the platform via bootstrapPlatformSdk() and receive
// an IPlatformSdk instance.  Modules then interact exclusively through the
// typed clients on that instance.

// ── Platform primitives (modules must not import kernel/services directly) ──────
export type { ILogger } from '@acc-reliability/kernel';
export { PlatformError } from '@acc-reliability/kernel';

export type {
  EquipmentId,
  CorrelationId,
  MessageId,
  RequestId,
  EventId,
  TraceId,
  OperationId,
} from '@acc-reliability/services';

// ── Bootstrap ─────────────────────────────────────────────────────────────────
export { bootstrapPlatformSdk } from './bootstrap';
export type { SdkBootstrapResult } from './bootstrap';
export { SDK_TOKENS } from './bootstrap';

// ── Main facade ───────────────────────────────────────────────────────────────
export type { IPlatformSdk } from './platform-sdk';

// ── Runtime context ───────────────────────────────────────────────────────────
export type { SdkContext } from './sdk-context';

// ── Module registration ───────────────────────────────────────────────────────
export type { ModuleManifest } from './module/module-manifest';

// ── Auth client ───────────────────────────────────────────────────────────────
export type { IAuthClient } from './clients/auth-client';

// Re-export auth value types modules legitimately need
export type {
  UserContext,
  SessionInfo,
  AuthCredentials,
  PasswordCredentials,
  TokenCredentials,
  ContractorId,
  UserId,
  SessionId,
  UserRole,
} from '@acc-reliability/services';

export { createContractorId, createUserId } from '@acc-reliability/services';

// ── Permissions client ────────────────────────────────────────────────────────
export type { IPermissionsClient } from './clients/permissions-client';

export type {
  AppRole,
  PermissionRequest,
  PermissionEntry,
  ModuleId,
  ActionType,
  ContractorScope,
} from '@acc-reliability/services';

// ── Notifications client ──────────────────────────────────────────────────────
export type { INotificationsClient, NotificationListFilter } from './clients/notifications-client';

export type {
  NotificationId,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  NotificationRecipient,
  NotificationPayload,
  NotificationRequest,
  NotificationRecord,
} from '@acc-reliability/services';

// ── Actions client ────────────────────────────────────────────────────────────
export type { IActionsClient } from './clients/actions-client';

export type {
  ActionId,
  ActionKind,
  ActionPriority,
  ActionStatus,
  ActionRecord,
  ActionCreateRequest,
  ActionUpdateRequest,
  ActionSummary,
} from '@acc-reliability/services';

// ── Audit client ──────────────────────────────────────────────────────────────
export type {
  IAuditClient,
  AuditEventCategory,
  AuditResult,
  AuditRequest,
} from './clients/audit-client';

export type {
  AuditEntry,
  AuditQuery,
  AuditTimeline,
  AuditCategory,
  AuditOutcome,
  AuditSeverity,
  AuditId,
} from '@acc-reliability/services';

// ── Health client ──────────────────────────────────────────────────────────────
export type { IHealthClient } from './clients/health-client';

export type {
  HealthCheckResult,
  HealthComponentStatus,
  HealthComponentRegistration,
  HealthSummary,
  HealthStatus,
  HealthCheckFn,
} from '@acc-reliability/services';

// ── Metrics client ────────────────────────────────────────────────────────────
export type { IMetricsClient } from './clients/metrics-client';

export type {
  MetricId,
  MetricKind,
  MetricValue,
  MetricTags,
  MetricDefinition,
  MetricSample,
  MetricSnapshot,
  MetricSummary,
} from '@acc-reliability/services';

export { createMetricId } from '@acc-reliability/services';

// ── Storage client ────────────────────────────────────────────────────────────
export type { IStorageClient } from './clients/storage-client';

export type {
  Entity,
  IRepository,
  FilterExpression,
  QueryOptions,
  PagedQueryOptions,
  PageResult,
  SortClause,
} from '@acc-reliability/storage';

// ── Workflow client ───────────────────────────────────────────────────────────
export type {
  IWorkflowClient,
  WorkflowStatus,
  WorkflowInstanceSummary,
} from './clients/workflow-client';

// ── Config client ─────────────────────────────────────────────────────────────
export type {
  IConfigClient,
  ConfigEntry,
  ConfigSummary,
  ConfigDataType,
} from './clients/config-client';

// ── User Management client ────────────────────────────────────────────────────
export type { IUserClient } from './clients/user-client';

export type {
  UserRecord,
  UserStatus,
  RoleAssignment,
  DelegationId,
  CreateUserRequest,
  UpdateUserRequest,
  AssignRoleRequest,
  AssignTemporaryRoleRequest,
  CreateDelegationRequest,
  UserListQuery,
  UserListResult,
} from '@acc-reliability/services';

export {
  USER_STATUSES,
  generateUserRecordId,
  createDelegationId,
  generateDelegationId,
} from '@acc-reliability/services';

// ── User domain errors (re-exported for module consumers) ─────────────────────
export {
  UserError,
  UserNotFoundError,
  UserDuplicateError,
  UserLifecycleError,
} from '@acc-reliability/services';

// ── Contractor Management client ──────────────────────────────────────────────
export type { IContractorClient } from './clients/contractor-client';

export type {
  ContractorRecord,
  ContractorStatus,
  ContractorRecordId,
  EquipmentScope,
  CreateContractorRequest,
  UpdateContractorRequest,
  ContractorListQuery,
  ContractorListResult,
} from '@acc-reliability/services';

export {
  CONTRACTOR_STATUSES,
  generateContractorRecordId,
  createContractorRecordId,
} from '@acc-reliability/services';

// ── Contractor domain errors (re-exported for module consumers) ───────────────
export {
  ContractorError,
  ContractorNotFoundError,
  ContractorDuplicateError,
  ContractorLifecycleError,
} from '@acc-reliability/services';

// ── Contractor scope (modules may need to inspect scope type) ─────────────────
export type {
  ContractorScopeFilter,
  ScopeType,
  GlobalScope,
  ContractorScope as ContractorScopeFilter_Contractor,
  DenyScope,
} from '@acc-reliability/storage';

// ── Module Registry client ────────────────────────────────────────────────────
export type { IModuleClient } from './clients/module-client';

export type {
  ModuleRecord,
  ModuleStatus,
  ModuleRecordId,
  ModuleHealthStatus,
  ModuleConfigStatus,
  ModuleLocalizationStatus,
  ModuleLearningStatus,
  ModuleSearchStatus,
  ModuleVisibility,
  RegisterModuleRequest,
  UpdateModuleRequest,
  ModuleListQuery,
  ModuleListResult,
} from '@acc-reliability/services';

export {
  MODULE_STATUSES,
  generateModuleRecordId,
  createModuleRecordId,
} from '@acc-reliability/services';

// ── Module domain errors (re-exported for module consumers) ──────────────────
export {
  ModuleError,
  ModuleNotFoundError,
  ModuleDuplicateError,
  ModuleLifecycleError,
} from '@acc-reliability/services';

// ── Notification Management client ────────────────────────────────────────────
export type { INotificationManagementClient } from './clients/notification-management-client';

export type {
  NotificationRuleRecord,
  NotificationObjectType,
  NotificationRuleStatus,
  NotificationRuleId,
  NotificationRuleSettings,
  CreateNotificationRuleRequest,
  UpdateNotificationRuleRequest,
  NotificationRuleListQuery,
  NotificationRuleListResult,
  NotificationManagementSummary,
} from '@acc-reliability/services';

export {
  NOTIFICATION_OBJECT_TYPES,
  NOTIFICATION_RULE_STATUSES,
  generateNotificationRuleId,
  createNotificationRuleId,
} from '@acc-reliability/services';

export {
  NotificationManagementError,
  NotificationRuleNotFoundError,
  NotificationRuleDuplicateError,
  NotificationRuleLifecycleError,
} from '@acc-reliability/services';

// ── Reporting client ──────────────────────────────────────────────────────────
export type { IReportingClient } from './clients/reporting-client';

export type {
  ReportRecord,
  ReportObjectType,
  ReportStatus,
  ReportId,
  ReportSettings,
  ExportFormat,
  CreateReportRequest,
  UpdateReportRequest,
  ReportListQuery,
  ReportListResult,
  ReportingSummary,
} from '@acc-reliability/services';

export {
  REPORT_OBJECT_TYPES,
  REPORT_STATUSES,
  EXPORT_FORMATS,
  generateReportId,
  createReportId,
} from '@acc-reliability/services';

export {
  ReportingError,
  ReportNotFoundError,
  ReportDuplicateError,
  ReportLifecycleError,
} from '@acc-reliability/services';

// ── Workflows client ──────────────────────────────────────────────────────────
export type { IWorkflowsClient } from './clients/workflows-client';

export type {
  WorkflowDefinitionRecord,
  WorkflowDefinitionStatus,
  WorkflowDefinitionId,
  WorkflowInstanceRecord,
  WorkflowInstanceId,
  WorkflowType,
  WorkflowStep,
  ApprovalRule,
  EscalationRule,
  SlaRule,
  ConditionRule,
  CreateWorkflowDefinitionRequest,
  UpdateWorkflowDefinitionRequest,
  WorkflowDefinitionListQuery,
  WorkflowDefinitionListResult,
  WorkflowInstanceListQuery,
  WorkflowInstanceListResult,
  WorkflowSummary,
} from '@acc-reliability/services';

export {
  WORKFLOW_DEFINITION_STATUSES,
  WORKFLOW_TYPES,
  generateWorkflowDefinitionId,
  createWorkflowDefinitionId,
} from '@acc-reliability/services';

export {
  WorkflowError,
  WorkflowDefinitionNotFoundError,
  WorkflowInstanceNotFoundError,
  WorkflowDefinitionDuplicateError,
  WorkflowLifecycleError,
  WorkflowInstanceLifecycleError,
} from '@acc-reliability/services';
