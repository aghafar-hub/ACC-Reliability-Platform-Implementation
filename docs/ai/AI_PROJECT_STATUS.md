# AI_PROJECT_STATUS.md

# ACC Reliability Platform — Project Status

Version: 1.5  
Last Updated: 2026-06-27  
Updated By: AI Agent (Milestone 4.5)

---

## Current Phase

**Phase 2 — Platform Services**

Active work is on Platform Services (`platform/services`). The Platform Kernel is complete and stable. Platform Services are being built on top of the kernel.

---

## Implemented So Far

### Milestone 4.5 — Health Service

**Package:** `@acc-reliability/services` (`platform/services/src/health/`)

| Component | File | Status |
|---|---|---|
| `HealthStatus` — healthy / warning / degraded / critical / offline / maintenance | `src/health/health-types.ts` | ✅ Complete |
| `HealthComponentCategory` / `KnownHealthCategory` / `HEALTH_CATEGORIES` — kernel, service, storage, module, communication | `src/health/health-types.ts` | ✅ Complete |
| `HealthCheckOutcome` — what a check function returns (status + message + details) | `src/health/health-types.ts` | ✅ Complete |
| `HealthCheckFn` — function type a component provides | `src/health/health-types.ts` | ✅ Complete |
| `HealthComponentRegistration` — descriptor for registering a component | `src/health/health-types.ts` | ✅ Complete |
| `DEFAULT_HEALTH_CHECK_TIMEOUT_MS` — 5 000 ms default timeout | `src/health/health-types.ts` | ✅ Complete |
| `HealthCheckResult` — full check record (componentId, status, checkedAt, durationMs, timedOut, error?) | `src/health/health-types.ts` | ✅ Complete |
| `HealthComponentStatus` — current state of a registered component including checkCount, consecutiveFailures | `src/health/health-types.ts` | ✅ Complete |
| `HealthSummary` — platform-wide snapshot with per-status counts and overallStatus | `src/health/health-types.ts` | ✅ Complete |
| `HealthServiceOptions` — defaultTimeoutMs option | `src/health/health-types.ts` | ✅ Complete |
| `IHealthService` — register, unregister, check, checkAll, getStatus, getSummary, isHealthy, listComponentIds | `src/health/health-types.ts` | ✅ Complete |
| `HealthService` — in-memory implementation; parallel checkAll; per-check timeout via Promise.race | `src/health/health-service.ts` | ✅ Complete |
| `HealthError` — base health error (`HEALTH_ERROR`) | `src/errors.ts` | ✅ Complete |
| `HealthCheckTimeoutError` — check exceeded timeoutMs (`HEALTH_CHECK_TIMEOUT`) | `src/errors.ts` | ✅ Complete |
| `HealthComponentNotFoundError` — unknown componentId (`HEALTH_COMPONENT_NOT_FOUND`) | `src/errors.ts` | ✅ Complete |
| Public barrel updated | `src/index.ts` | ✅ Updated |

---

### Milestone 4.4 — Communication Contracts

**Package:** `@acc-reliability/services` (`platform/services/src/contracts/`)

| Component | File | Status |
|---|---|---|
| `CorrelationId`, `MessageId`, `RequestId`, `EventId`, `TraceId`, `OperationId` — branded tracing identifiers | `src/contracts/correlation.ts` | ✅ Complete |
| `createCorrelationId`, `createMessageId`, `createRequestId`, `createEventId`, `createTraceId`, `createOperationId` — factories | `src/contracts/correlation.ts` | ✅ Complete |
| `EquipmentId` — master cross-platform equipment identifier | `src/contracts/communication-types.ts` | ✅ Complete |
| `PlatformModule` / `KnownPlatformModule` / `PLATFORM_MODULES` — 9 known modules + extensible | `src/contracts/communication-types.ts` | ✅ Complete |
| `MessagePriority` — low / normal / high / critical | `src/contracts/communication-types.ts` | ✅ Complete |
| `ContractVersion` / `CONTRACT_VERSION_1_0` — versioning token | `src/contracts/communication-types.ts` | ✅ Complete |
| `MessageMetadata` — immutable header (messageId, correlationId, traceId, timestamp, sourceModule, targetModule, userId, contractorId, equipmentId, priority, version) | `src/contracts/communication-types.ts` | ✅ Complete |
| `PlatformEvent<T>` — base domain event envelope | `src/contracts/communication-types.ts` | ✅ Complete |
| `PlatformMessage<T>` — base command/request envelope | `src/contracts/communication-types.ts` | ✅ Complete |
| `OilChangeCompletedEvent` — oil change recorded | `src/contracts/platform-events.ts` | ✅ Complete |
| `OilAnalysisCompletedEvent` — analysis report received | `src/contracts/platform-events.ts` | ✅ Complete |
| `OilAnalysisCriticalEvent` — critical finding detected | `src/contracts/platform-events.ts` | ✅ Complete |
| `ResampleRequiredEvent` — re-sample needed | `src/contracts/platform-events.ts` | ✅ Complete |
| `ActionCreatedEvent` — action assigned | `src/contracts/platform-events.ts` | ✅ Complete |
| `ActionCompletedEvent` — action finished | `src/contracts/platform-events.ts` | ✅ Complete |
| `EquipmentStatusChangedEvent` — equipment state transition | `src/contracts/platform-events.ts` | ✅ Complete |
| `RouteAssignedEvent` — route assigned to technician | `src/contracts/platform-events.ts` | ✅ Complete |
| `RouteCompletedEvent` — route work finished | `src/contracts/platform-events.ts` | ✅ Complete |
| `HealthStatusChangedEvent` — component health transition | `src/contracts/platform-events.ts` | ✅ Complete |
| `UserCreatedEvent` — new user account | `src/contracts/platform-events.ts` | ✅ Complete |
| `UserUpdatedEvent` — user profile changed | `src/contracts/platform-events.ts` | ✅ Complete |
| `PermissionChangedEvent` — permission grant/revoke | `src/contracts/platform-events.ts` | ✅ Complete |
| `AnyPlatformEvent` — discriminated union of all events | `src/contracts/platform-events.ts` | ✅ Complete |
| `OilChangeRequestedMessage` — request an oil change | `src/contracts/platform-messages.ts` | ✅ Complete |
| `NotificationRequestedMessage` — request notification delivery | `src/contracts/platform-messages.ts` | ✅ Complete |
| `AnyPlatformMessage` — discriminated union of all messages | `src/contracts/platform-messages.ts` | ✅ Complete |
| Public barrel updated | `src/index.ts` | ✅ Updated |

---

### Milestone 4.3 — Storage Abstraction Contracts

**Package:** `@acc-reliability/services` (`platform/services/src/storage/`)

| Component | File | Status |
|---|---|---|
| `FilterOperator` — 13 comparison/membership operators | `src/storage/query-types.ts` | ✅ Complete |
| `FieldFilter<T>` — single-field predicate (discriminated, `kind: 'field'`) | `src/storage/query-types.ts` | ✅ Complete |
| `CompositeFilter<T>` — and/or tree (`kind: 'composite'`) | `src/storage/query-types.ts` | ✅ Complete |
| `FilterExpression<T>` — union of FieldFilter and CompositeFilter | `src/storage/query-types.ts` | ✅ Complete |
| `SortDirection`, `SortClause<T>` — sort terms with field safety | `src/storage/query-types.ts` | ✅ Complete |
| `PageRequest` — 1-based page + pageSize | `src/storage/query-types.ts` | ✅ Complete |
| `PageResult<T>` — items + totalCount + pagination metadata | `src/storage/query-types.ts` | ✅ Complete |
| `QueryOptions<T>` — optional filter + sort + page | `src/storage/query-types.ts` | ✅ Complete |
| `PagedQueryOptions<T>` — QueryOptions with required page | `src/storage/query-types.ts` | ✅ Complete |
| `StorageProviderKind` — GoogleSheets, SQLServer, PostgreSQL, SQLite, Mock | `src/storage/storage-types.ts` | ✅ Complete |
| `GoogleSheetsProviderConfig` — spreadsheetId, credentialsJson, scopes | `src/storage/storage-types.ts` | ✅ Complete |
| `SqlServerProviderConfig` — host, port, database, pool config | `src/storage/storage-types.ts` | ✅ Complete |
| `PostgreSQLProviderConfig` — connectionString, pool config | `src/storage/storage-types.ts` | ✅ Complete |
| `SQLiteProviderConfig` — filePath, readOnly | `src/storage/storage-types.ts` | ✅ Complete |
| `MockStorageProviderConfig` — seedData map | `src/storage/storage-types.ts` | ✅ Complete |
| `StorageProviderConfig` — discriminated union of all configs | `src/storage/storage-types.ts` | ✅ Complete |
| `StorageHealthState`, `StorageHealthStatus` — health probe result | `src/storage/storage-types.ts` | ✅ Complete |
| `Entity` — base shape with `id: string` | `src/storage/storage-types.ts` | ✅ Complete |
| `ITransaction` — id, startedAt, isActive, commit(), rollback() | `src/storage/storage-types.ts` | ✅ Complete |
| `IRepository<T extends Entity>` — full CRUD + query contract | `src/storage/storage-types.ts` | ✅ Complete |
| `IStorageProvider` — connect, disconnect, getRepository, transactions, healthCheck | `src/storage/storage-types.ts` | ✅ Complete |
| `StorageError` — base storage error (`STORAGE_ERROR`) | `src/errors.ts` | ✅ Complete |
| `ConnectionError` — backend unreachable (`STORAGE_CONNECTION_ERROR`) | `src/errors.ts` | ✅ Complete |
| `QueryError` — invalid query or unsupported operator (`STORAGE_QUERY_ERROR`) | `src/errors.ts` | ✅ Complete |
| `EntityNotFoundError` — entity not in contractor scope (`STORAGE_NOT_FOUND`) | `src/errors.ts` | ✅ Complete |
| `DuplicateEntityError` — unique constraint violated (`STORAGE_DUPLICATE`) | `src/errors.ts` | ✅ Complete |
| `TransactionError` — tx unsupported or failed (`STORAGE_TRANSACTION_ERROR`) | `src/errors.ts` | ✅ Complete |
| Public barrel updated | `src/index.ts` | ✅ Updated |

---

### Milestone 4.2 — Authorization and Permission Contracts

**Package:** `@acc-reliability/services` (`platform/services/src/authz/`)

| Component | File | Status |
|---|---|---|
| `AppRole` — open union of platform roles (AppOwner, Manager, Engineer, ContractorManager, ContractorEngineer, Viewer) | `src/authz/authz-types.ts` | ✅ Complete |
| `PLATFORM_ROLES` — ordered const tuple of built-in roles | `src/authz/authz-types.ts` | ✅ Complete |
| `KnownAppRole` — literal union derived from `PLATFORM_ROLES` | `src/authz/authz-types.ts` | ✅ Complete |
| `ContractorScope` — `ContractorId \| 'all'`; enforces contractor isolation | `src/authz/authz-types.ts` | ✅ Complete |
| `ModuleId` / `KnownModuleId` — 5 built-in modules + extensible | `src/authz/authz-types.ts` | ✅ Complete |
| `KNOWN_MODULES` — const tuple of built-in module ids | `src/authz/authz-types.ts` | ✅ Complete |
| `ActionType` / `KnownActionType` — 7 built-in actions + extensible | `src/authz/authz-types.ts` | ✅ Complete |
| `KNOWN_ACTIONS` — const tuple of built-in action types | `src/authz/authz-types.ts` | ✅ Complete |
| `PermissionEntry` — resolved permission grant (module + action + scope) | `src/authz/authz-types.ts` | ✅ Complete |
| `PermissionRequest` — structural permission check descriptor | `src/authz/authz-types.ts` | ✅ Complete |
| `IPermissionService` — authorization service interface | `src/authz/authz-types.ts` | ✅ Complete |
| `AuthorizationError` — base error for all permission failures | `src/errors.ts` | ✅ Complete |
| `PermissionDeniedError` — 403-equivalent; action not permitted | `src/errors.ts` | ✅ Complete |
| Public barrel updated | `src/index.ts` | ✅ Updated |

---

### Milestone 4.1 — Authentication Service Interface

**Package:** `@acc-reliability/services` (`platform/services/src/auth/`)

| Component | File | Status |
|---|---|---|
| Branded identity types + factories | `src/auth/auth-types.ts` | ✅ Complete |
| `UserContext` — immutable authenticated user snapshot | `src/auth/auth-types.ts` | ✅ Complete |
| `SessionInfo` — session metadata | `src/auth/auth-types.ts` | ✅ Complete |
| `AuthCredentials` — discriminated union (password, token) | `src/auth/auth-types.ts` | ✅ Complete |
| `IAuthService` — authentication service interface | `src/auth/auth-types.ts` | ✅ Complete |
| `AuthError`, `AuthenticationError`, `SessionExpiredError` | `src/errors.ts` | ✅ Complete |
| Public barrel | `src/index.ts` | ✅ Complete |
| Package scaffold (package.json, tsconfig.json) | `platform/services/` | ✅ Complete |

---

### Milestone 3.1 — Kernel Bootstrap

**Package:** `@acc-reliability/kernel` (`platform/kernel`)

| Component | File | Status |
|---|---|---|
| Bootstrap entry point | `src/bootstrap.ts` | ✅ Complete |
| Platform Context | `src/platform-context.ts` | ✅ Complete |
| Service Registry | `src/service-registry.ts` | ✅ Complete (hardened in 3.3) |
| Module Registry | `src/module-registry.ts` | ✅ Complete |
| Platform Logger | `src/logger.ts` | ✅ Complete |
| Error Hierarchy | `src/errors.ts` | ✅ Complete |
| Public API barrel | `src/index.ts` | ✅ Complete |

### Milestone 3.6 — Platform Lifecycle Manager

**Package:** `@acc-reliability/kernel` (`platform/kernel/src/lifecycle/`)

| Component | File | Status |
|---|---|---|
| Lifecycle states + component/manager types | `src/lifecycle/lifecycle-types.ts` | ✅ Complete |
| State transition table + guards | `src/lifecycle/lifecycle-state.ts` | ✅ Complete |
| `LifecycleManager` — register, init, shutdown, restart, health states | `src/lifecycle/lifecycle-manager.ts` | ✅ Complete |
| `LifecycleError` | `src/errors.ts` | ✅ Complete |
| Bootstrap: `platform.lifecycle` registered and marked `running` | `src/bootstrap.ts` | ✅ Updated |
| Public barrel updated | `src/index.ts` | ✅ Updated |

### Milestone 3.5 — Platform Event Bus Interfaces

**Package:** `@acc-reliability/kernel` (`platform/kernel/src/events/`)

| Component | File | Status |
|---|---|---|
| `EventToken<T>` — phantom-typed event channel handle | `src/events/event-token.ts` | ✅ Complete |
| `IEventBus`, `IEventHandler<T>`, `EventSubscription`, `EventChannelInfo` | `src/events/event-bus-types.ts` | ✅ Complete |
| `NullEventBus` — no-op Phase 1 implementation | `src/events/null-event-bus.ts` | ✅ Complete |
| `EventBusError` | `src/errors.ts` | ✅ Complete |
| Bootstrap: `platform.eventBus` registered and marked `running` | `src/bootstrap.ts` | ✅ Updated |
| Public barrel updated | `src/index.ts` | ✅ Updated |

### Milestone 3.4 — Dependency Injection Container

**Package:** `@acc-reliability/kernel` (`platform/kernel/src/di/`)

| Component | File | Status |
|---|---|---|
| `Token<T>` — typed dependency handle | `src/di/token.ts` | ✅ Complete |
| `IContainer`, `Factory`, `RegistrationKind`, `ContainerRegistrationInfo` | `src/di/container-types.ts` | ✅ Complete |
| `Container` — singleton, lazy-singleton, transient, circular-dep detection | `src/di/container.ts` | ✅ Complete |
| `ContainerError` | `src/errors.ts` | ✅ Complete |
| Public barrel updated | `src/index.ts` | ✅ Updated |

### Milestone 3.3 — Service Registry Hardening

**Package:** `@acc-reliability/kernel` (`platform/kernel`)

| Component | File | Status |
|---|---|---|
| ServiceStatus type | `src/service-registry.ts` | ✅ Complete |
| ServiceInfo type (public descriptor without instance) | `src/service-registry.ts` | ✅ Complete |
| Lifecycle timestamps (initializedAt, startedAt, stoppedAt) | `src/service-registry.ts` | ✅ Complete |
| `tryRegister()` — duplicate-safe registration | `src/service-registry.ts` | ✅ Complete |
| `getRequired()` — assert-style retrieval | `src/service-registry.ts` | ✅ Complete |
| `setStatus()` — lifecycle transition | `src/service-registry.ts` | ✅ Complete |
| `getStatus()` — status query | `src/service-registry.ts` | ✅ Complete |
| `listByStatus()` — filtered listing | `src/service-registry.ts` | ✅ Complete |
| `clear()` — reset for tests | `src/service-registry.ts` | ✅ Complete |
| Bootstrap: core services marked `running` | `src/bootstrap.ts` | ✅ Updated |

### Milestone 3.2 — Platform Configuration Manager

**Package:** `@acc-reliability/kernel` (`platform/kernel/src/config/`)

| Component | File | Status |
|---|---|---|
| Configuration types | `src/config/config-types.ts` | ✅ Complete |
| Static defaults | `src/config/default-config.ts` | ✅ Complete |
| Environment overrides | `src/config/environment.ts` | ✅ Complete |
| Validation | `src/config/config-validator.ts` | ✅ Complete |
| Configuration Manager | `src/config/config-manager.ts` | ✅ Complete |
| Bootstrap updated | `src/bootstrap.ts` | ✅ Updated |
| Old config-loader removed | `src/config-loader.ts` | 🗑 Deleted |

---

## What Is NOT Yet Implemented

> **Phase 2 sequencing note:** Storage Abstraction Contracts (4.3) and Communication Contracts (4.4) are prioritised before business-module migration. All modules consume platform abstractions; those contracts must be stable first.  
> **Event Bus:** Real Event Bus implementation is deferred to a Future Phase (Phase 9). `NullEventBus` from Phase 1 remains the only runtime artifact. Do not implement an Event Bus in Phase 2.

| Milestone | Capability | Notes |
|---|---|---|
| 4.4 | Communication Contracts | ✅ Done — 4 contract files, 6 identifier types, 13 events, 2 messages, `AnyPlatformEvent` union |
| 4.5 | Health Service | ✅ Done — `IHealthService`, `HealthService` (in-memory), 6 health states, 5 categories, `HealthSummary`, timeout + parallel checks, 3 error classes |
| 4.6 | Metrics Service | `IMetricsService`, `MetricEntry`, counter/gauge/histogram contracts |
| 4.7 | Notification Service | `INotificationService`, `NotificationPayload`, channel contracts |
| 4.8 | Action Service | `IActionService`, `ActionRequest`, `ActionResult` contracts |
| 4.9 | Audit Service | `IAuditService`, `AuditEntry`, write-only audit trail contracts |
| 4.10 | Platform SDK | `@acc-reliability/sdk` public API, module registration helpers, typed service resolution |
| — | Owner Control Center | First app; depends on SDK and all service contracts |
| — | Module Migration | oil-lubrication, vibration-analysis, etc.; requires 4.3 and 4.4 stable first |
| — | Event Bus (Future Phase 9) | Prepare code only; do not implement yet |
| — | AI Integration | Future Phase 10 |
| — | External Integrations | Future Phase 11 |
| — | SQL Migration | Future Phase 12 |

---

## Active Packages

```
platform/kernel/     @acc-reliability/kernel     v0.1.0
platform/services/   @acc-reliability/services   v0.1.0
```

All other packages under `platform/`, `modules/`, and `apps/` are empty scaffolds.

---

## Configuration Groups Available

As of Milestone 3.2, the platform supports 8 strongly typed configuration groups:

| Group | Interface | Key Fields |
|---|---|---|
| Platform | `PlatformGroup` | name, version, environment |
| Security | `SecurityGroup` | sessionTimeout, maxLoginAttempts, tokenExpiry |
| Storage | `StorageGroup` | provider, timeouts, retries |
| Logging | `LoggingGroup` | level, prefix, timestamps |
| Feature Flags | `FeatureFlags` | authentication, notifications, audit, offlineMode, aiAssistant, developerTools |
| Runtime | `RuntimeGroup` | concurrency, timeouts |
| Build | `BuildGroup` | configSource, builtAt, commitHash |
| Module Defaults | `ModuleDefaultsGroup` | enabledByDefault, loadTimeout, retries |

---

## Known Limitations / Next Steps

1. `IAuthService` is an interface only — no implementation exists yet. Milestone 4.1 establishes the contract; the implementation (e.g. Google Identity, session-based) belongs to a future implementation milestone.
2. `ContractorId`, `UserId`, `SessionId` are branded types. Always use the factory functions (`createContractorId`, `createUserId`, `createSessionId`) to produce values — never cast raw strings directly.
3. `UserRole` is an open string union. The known platform roles are defined; module-specific roles can extend freely.
4. `AuthCredentials` currently supports `password` and `token` kinds. OAuth/SAML kinds will be added when an identity provider is introduced.
5. `ConfigManager` currently only supports static defaults + env var overrides. The `IConfigProvider` interface is ready for a remote config source (future milestone).
6. Feature flags are all `false` by default except `developerTools`. Enable per-environment via `ACC_FEATURE_*` env vars.
7. Storage provider is configured but no implementation exists yet (`platform/storage` is a future milestone).
8. Authentication is not implemented (`IAuthService` contract is defined; no concrete implementation yet).
11. `IPermissionService` is an interface only — no implementation exists yet. Milestone 4.2 establishes the contract; the implementation belongs to a future milestone once the role-to-permission mapping strategy is confirmed.
12. `AppRole` is an open string union. The 6 platform roles are defined; module-specific or contractor-specific roles can extend freely.
13. `ContractorScope = ContractorId | 'all'` — `'all'` is only valid for `AppOwner` users. Implementations must enforce this invariant; the type alone does not prevent misuse.
14. The service id `platform.permissions` is reserved in the Service Registry. No registration occurs until an implementation exists.
15. `IStorageProvider` and `IRepository<T>` are interfaces only — no implementation exists yet. Milestone 4.3 establishes the contracts; concrete implementations (Google Sheets adapter, SQL adapters) belong to future milestones.
16. The service id `platform.storage` is reserved in the Service Registry. No registration occurs until an implementation exists.
17. `ITransaction` is fully defined but Google Sheets will not support it. Google Sheets implementations must throw `TransactionError` from `beginTransaction()` — they must not omit the method.
18. `Entity.id` is a plain `string`. Platform-specific branded identifiers (e.g. `EquipmentId`) that satisfy this shape structurally are used by business modules; the `Entity` constraint does not prevent this.
19. `SqlServerProviderConfig.password` and `GoogleSheetsProviderConfig.credentialsJson` must be sourced from environment variables or a secret store — never hardcoded.
9. `NullEventBus` is a no-op placeholder. A real in-process event bus will be introduced in Phase 9.
10. `LifecycleManager` is registered at `platform.lifecycle`. Platform Services will implement `ILifecycleComponent` as they are built.
20. All communication contracts in `src/contracts/` are type-only — no transport, no publish/subscribe, no queuing. They define the shape of data; delivery mechanism is not yet implemented.
21. `EquipmentId` is now the canonical branded type for equipment identity in contracts. Business modules must use `createEquipmentId()` to produce values; never cast raw strings.
22. `AnyPlatformEvent` and `AnyPlatformMessage` are discriminated unions. Adding a new event requires: (a) payload interface, (b) typed envelope interface, (c) version constant, (d) add to the union, (e) re-export from `index.ts`.
23. `PlatformModule` is an open union. New modules are added to `PLATFORM_MODULES` in `communication-types.ts` without requiring changes in event or message files.
24. `HealthService` is an in-memory implementation. It holds no persistent state — statuses reset on process restart. The service id `platform.health` is reserved for registration in the Service Registry; no registration occurs until an implementation milestone wires it into bootstrap.
25. `HealthStatus` in the health service (`healthy | warning | degraded | critical | offline | maintenance`) and `ComponentHealthStatus` in `platform-events.ts` (`healthy | degraded | unhealthy | unknown`) are separate types serving different purposes. Mapping between them is the responsibility of the layer that publishes `HealthStatusChangedEvent`.
26. `consecutiveFailures` in `HealthComponentStatus` resets to `0` on any `healthy` or `maintenance` result. Escalation logic (e.g. auto-create action after N failures) belongs to a future milestone.

---

## Related Documents

- [AI_MILESTONE_TRACKER.md](./AI_MILESTONE_TRACKER.md) — full milestone history
- [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) — system architecture
- [PLATFORM_KERNEL_REFERENCE.md](./PLATFORM_KERNEL_REFERENCE.md) — kernel API reference
- [AI_DEVELOPMENT_GUIDE.md](./AI_DEVELOPMENT_GUIDE.md) — engineering rules

---

*End of document.*
