// platform/sdk/src/index.ts
// Public API surface for @acc-reliability/sdk.
//
// Business modules import from this package only.  They must not import
// from @acc-reliability/kernel, @acc-reliability/services, or
// @acc-reliability/storage directly (PS-114 SDK-002).

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
export type { IConfigClient } from './clients/config-client';

// ── Contractor scope (modules may need to inspect scope type) ─────────────────
export type {
  ContractorScopeFilter,
  ScopeType,
  GlobalScope,
  ContractorScope as ContractorScopeFilter_Contractor,
  DenyScope,
} from '@acc-reliability/storage';
