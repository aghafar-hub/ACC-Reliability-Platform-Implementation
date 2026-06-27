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
} from './errors';
